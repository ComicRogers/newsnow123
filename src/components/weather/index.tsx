import { useTitle } from "react-use"
import { useCallback, useEffect, useState } from "react"
import { metadata } from "@shared/metadata"

// 定义 $ 函数用于合并类名
const $ = (classes: string[]) => classes.filter(Boolean).join(' ')

// 和风天气API密钥
const HEFENG_API_KEY = import.meta.env.WEATHERKEY || "91df240a02a04e41845ceb73727dc55e"

// 和风天气图标映射
const hefengIconMap: Record<string, string> = {
  100: "ph:sun-bold", // 晴
  101: "ph:cloud-sun-bold", // 多云
  102: "ph:cloud-sun-bold", // 少云
  103: "ph:cloud-bold", // 晴间多云
  104: "ph:cloud-bold", // 阴
  150: "ph:moon-bold", // 晴(夜间)
  151: "ph:cloud-moon-bold", // 多云(夜间)
  152: "ph:cloud-moon-bold", // 少云(夜间)
  153: "ph:cloud-moon-bold", // 晴间多云(夜间)
  300: "ph:cloud-rain-bold", // 阵雨
  301: "ph:cloud-rain-bold", // 强阵雨
  302: "ph:cloud-lightning-bold", // 雷阵雨
  303: "ph:cloud-lightning-bold", // 强雷阵雨
  304: "ph:cloud-snow-bold", // 雷阵雨伴有冰雹
  305: "ph:cloud-rain-bold", // 小雨
  306: "ph:cloud-rain-bold", // 中雨
  307: "ph:cloud-rain-bold", // 大雨
  308: "ph:cloud-rain-bold", // 极端降雨
  309: "ph:cloud-rain-bold", // 毛毛雨/细雨
  310: "ph:cloud-rain-bold", // 暴雨
  311: "ph:cloud-rain-bold", // 大暴雨
  312: "ph:cloud-rain-bold", // 特大暴雨
  313: "ph:cloud-rain-bold", // 冻雨
  314: "ph:cloud-rain-bold", // 小到中雨
  315: "ph:cloud-rain-bold", // 中到大雨
  316: "ph:cloud-rain-bold", // 大到暴雨
  317: "ph:cloud-rain-bold", // 暴雨到大暴雨
  318: "ph:cloud-rain-bold", // 大暴雨到特大暴雨
  350: "ph:cloud-rain-bold", // 阵雨(夜间)
  351: "ph:cloud-rain-bold", // 强阵雨(夜间)
  399: "ph:cloud-rain-bold", // 雨
  400: "ph:snowflake-bold", // 小雪
  401: "ph:snowflake-bold", // 中雪
  402: "ph:snowflake-bold", // 大雪
  403: "ph:snowflake-bold", // 暴雪
  404: "ph:cloud-snow-bold", // 雨夹雪
  405: "ph:cloud-snow-bold", // 雨雪天气
  406: "ph:cloud-snow-bold", // 阵雨夹雪
  407: "ph:snowflake-bold", // 阵雪
  408: "ph:snowflake-bold", // 小到中雪
  409: "ph:snowflake-bold", // 中到大雪
  410: "ph:snowflake-bold", // 大到暴雪
  456: "ph:cloud-snow-bold", // 阵雨夹雪(夜间)
  457: "ph:cloud-snow-bold", // 阵雪(夜间)
  499: "ph:snowflake-bold", // 雪
  500: "ph:cloud-fog-bold", // 薄雾
  501: "ph:cloud-fog-bold", // 雾
  502: "ph:cloud-fog-bold", // 霾
  503: "ph:cloud-fog-bold", // 扬沙
  504: "ph:cloud-fog-bold", // 浮尘
  507: "ph:cloud-fog-bold", // 沙尘暴
  508: "ph:cloud-fog-bold", // 强沙尘暴
  509: "ph:cloud-fog-bold", // 浓雾
  510: "ph:cloud-fog-bold", // 强浓雾
  511: "ph:cloud-fog-bold", // 中度霾
  512: "ph:cloud-fog-bold", // 重度霾
  513: "ph:cloud-fog-bold", // 严重霾
  514: "ph:cloud-fog-bold", // 大雾
  515: "ph:cloud-fog-bold", // 特强浓雾
  900: "ph:sun-bold", // 热
  901: "ph:snowflake-bold", // 冷
  999: "ph:question-bold", // 未知
}

// 缓存时间（毫秒）- 30分钟
const CACHE_DURATION = 30 * 60 * 1000

// 从本地存储获取缓存数据
function getCachedData(key: string) {
  try {
    const cachedData = localStorage.getItem(key)
    if (!cachedData) return null

    const { data, timestamp } = JSON.parse(cachedData)
    // 检查缓存是否过期
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch (error) {
    console.error("读取缓存数据错误:", error)
    return null
  }
}

// 将数据保存到本地存储
function setCachedData(key: string, data: any) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch (error) {
    console.error("保存缓存数据错误:", error)
  }
}

// 天气数据接口
interface WeatherData {
  location: string
  country: string
  temperature: number
  feelsLike: number
  condition: string
  description: string
  icon: string
  humidity: number
  windSpeed: string
  windScale: string
  pressure: number
  visibility: number
  sunrise: number
  sunset: number
  timezone: number
  dt: number
  forecast: {
    date: string
    dayOfWeek: string
    condition: string
    description: string
    highTemp: number
    lowTemp: number
    icon: string
    humidity: number
    windSpeed: string
    windScale: string
    pop: number // 降水量，单位毫米
  }[]
  hourly: {
    time: string
    temp: number
    icon: string
    pop: number
  }[]
}

// 带重试功能的fetch
async function fetchWithRetry(url: string, options = {}, retries = 3, delay = 1000) {
  // 添加时间戳或随机数以防止缓存
  const urlWithNoCacheParam = url.includes("?")
    ? `${url}&_nocache=${Date.now()}`
    : `${url}?_nocache=${Date.now()}`

  try {
    const response = await fetch(urlWithNoCacheParam, {
      ...options,
      headers: {
        ...((options as any).headers || {}),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  } catch (error) {
    if (retries <= 1) throw error
    await new Promise(resolve => setTimeout(resolve, delay))
    return fetchWithRetry(url, options, retries - 1, delay * 2)
  }
}

// 格式化时间戳为时间
function formatTime(timestamp: number, timezone: number, format: "time" | "date" | "day" = "time") {
  const date = new Date((timestamp + timezone) * 1000)

  if (format === "time") {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
  } else if (format === "date") {
    return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
  } else if (format === "day") {
    const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    return days[date.getDay()]
  }

  return date.toLocaleTimeString("zh-CN")
}

export function Weather() {
  const [city, setCity] = useState<string>("南京")
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // 获取天气数据
  const fetchWeatherData = useCallback(async (cityName: string) => {
    setLoading(true)
    setError(null)

    // 尝试从缓存获取数据
    const cachedData = getCachedData(cityName)
    if (cachedData) {
      setWeatherData(cachedData)
      setCity(cachedData.location)
      setLoading(false)
      return
    }

    // 如果离线且没有缓存数据，显示错误
    if (isOffline) {
      setError("当前处于离线状态，无法获取新的天气数据")
      setLoading(false)
      return
    }

    try {
      // 使用和风天气API
      // 先获取城市ID
      const citySearchResponse = await fetchWithRetry(
        `https://geoapi.qweather.com/v2/city/lookup?location=${cityName}&key=${HEFENG_API_KEY}`,
      )
      const cityData = await citySearchResponse.json()

      if (cityData.code !== "200" || !cityData.location || cityData.location.length === 0) {
        throw new Error("找不到该城市，请检查拼写或尝试其他城市")
      }

      const cityId = cityData.location[0].id
      const cityInfo = cityData.location[0]

      // 获取当前天气
      const hefengResponse = await fetchWithRetry(
        `https://devapi.qweather.com/v7/weather/now?location=${cityId}&key=${HEFENG_API_KEY}&lang=zh`,
      )
      const hefengData = await hefengResponse.json()

      if (hefengData.code !== "200") {
        throw new Error("获取天气数据失败，请稍后再试")
      }

      // 获取7天预报
      const hefengForecastResponse = await fetchWithRetry(
        `https://devapi.qweather.com/v7/weather/7d?location=${cityId}&key=${HEFENG_API_KEY}&lang=zh`,
      )
      const hefengForecastData = await hefengForecastResponse.json()

      // 获取24小时预报
      const hefengHourlyResponse = await fetchWithRetry(
        `https://devapi.qweather.com/v7/weather/24h?location=${cityId}&key=${HEFENG_API_KEY}&lang=zh`,
      )
      const hefengHourlyData = await hefengHourlyResponse.json()

      // 构建天气数据对象
      const formattedData: WeatherData = {
        location: cityInfo.name,
        country: cityInfo.country,
        temperature: Number.parseInt(hefengData.now.temp),
        feelsLike: Number.parseInt(hefengData.now.feelsLike),
        condition: hefengData.now.text,
        description: hefengData.now.text,
        icon: hefengIconMap[hefengData.now.icon] || "ph:question-bold",
        humidity: Number.parseInt(hefengData.now.humidity),
        windSpeed: `${hefengData.now.windSpeed || "0"} km/h`,
        windScale: `${hefengData.now.windScale || "0"}级`,
        pressure: Number.parseInt(hefengData.now.pressure),
        visibility: Number.parseInt(hefengData.now.vis),
        sunrise: Math.floor(new Date().setHours(6, 0, 0, 0) / 1000), // 临时数据
        sunset: Math.floor(new Date().setHours(18, 0, 0, 0) / 1000), // 临时数据
        timezone: 0,
        dt: Math.floor(Date.now() / 1000),
        forecast: hefengForecastData.daily.map((day: any) => ({
          date: day.fxDate.substring(5), // 只保留月-日
          dayOfWeek: formatTime(new Date(day.fxDate).getTime() / 1000, 0, "day"),
          condition: day.textDay,
          description: day.textDay,
          highTemp: Number.parseInt(day.tempMax),
          lowTemp: Number.parseInt(day.tempMin),
          icon: hefengIconMap[day.iconDay] || "ph:question-bold",
          humidity: Number.parseInt(day.humidity),
          windSpeed: `${day.windSpeedDay || "0"} km/h`, // 风速 km/h
          windScale: `${day.windScaleDay || "0"}级`, // 风力等级
          pop: Number.parseFloat(day.precip), // 降水量，单位毫米
        })),
        hourly: hefengHourlyData.hourly.map((hour: any) => ({
          time: hour.fxTime.substring(11, 16), // 只保留时:分
          temp: Number.parseInt(hour.temp),
          icon: hefengIconMap[hour.icon] || "ph:question-bold",
          pop: Number.parseInt(hour.pop), // 降水概率
        })),
      }

      // 保存数据到缓存
      setCachedData(cityName, formattedData)

      setWeatherData(formattedData)
      setCity(cityInfo.name)
      setLoading(false)
    } catch (err: any) {
      console.error("天气数据获取错误:", err)

      // 检查是否为网络错误（可能是API被墙）
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setError("无法连接到天气服务，可能是网络问题或服务在您的地区不可用。如果您在中国大陆，可能需要使用VPN或考虑替换为国内可用的天气API。")
      } else {
        setError(err.message || "获取天气数据失败，请稍后再试")
      }
      setLoading(false)
    }
  }, [isOffline])

  // 处理搜索提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      fetchWeatherData(searchInput.trim())
    }
  }

  // 显示温度
  const displayTemperature = (celsius: number) => {
    return `${celsius}°C`
  }

  // 初始加载时获取默认城市天气
  useEffect(() => {
    fetchWeatherData(city)
  }, [fetchWeatherData, city])

  useTitle(`NewsDaily | ${metadata.weather.name}`)

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* 搜索栏 */}
      <form onSubmit={handleSearch} className="mb-6 flex">
        <input
          type="text"
          placeholder="搜索城市"
          className="flex-1 py-2 px-4 rounded-l-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-primary text-white py-2 px-6 rounded-r-lg hover:bg-primary/90 transition-colors"
        >
          搜索
        </button>
      </form>

      {isOffline
        ? (
            <div className="text-center text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              当前处于离线状态，无法获取天气数据
            </div>
          )
        : loading
          ? (
              <div className="flex justify-center items-center h-40">
                <div className="text-primary animate-spin i-ph:spinner-gap-bold text-3xl"></div>
              </div>
            )
          : error
            ? (
                <div className="text-center text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                  {error}
                </div>
              )
            : weatherData
              ? (
                  <>
                    {/* 当前天气卡片 */}
                    <div className={$([
                      "p-6 rounded-2xl mb-6",
                      "shadow shadow-primary/20 hover:shadow-primary/30 transition-shadow-500",
                      "bg-primary/5 dark:bg-primary/10",
                    ])}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="mb-4 md:mb-0">
                          <div className="flex items-center mb-1">
                            <h2 className="text-2xl font-bold text-primary">{weatherData.location}</h2>
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{weatherData.country}</span>
                          </div>
                          <p className="text-5xl font-bold">{displayTemperature(weatherData.temperature)}</p>
                          <p className="text-gray-600 dark:text-gray-300 mt-1">{weatherData.description}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            体感温度:
                            {" "}
                            {displayTemperature(weatherData.feelsLike)}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {formatTime(weatherData.dt, weatherData.timezone)}
                            {" "}
                            更新
                          </p>
                        </div>
                        <div className="text-8xl text-primary">
                          <div className={`i-${weatherData.icon}`}></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="flex items-center">
                          <div className="i-ph:drop-half-bottom-bold text-primary text-xl mr-2"></div>
                          <span>
                            湿度:
                            {weatherData.humidity}
                            %
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className="i-ph:wind-bold text-primary text-xl mr-2"></div>
                          <span>{weatherData.windSpeed}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="i-ph:gauge-bold text-primary text-xl mr-2"></div>
                          <span>
                            气压:
                            {weatherData.pressure}
                            {" "}
                            hPa
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className="i-ph:eye-bold text-primary text-xl mr-2"></div>
                          <span>
                            能见度:
                            {weatherData.visibility}
                            {" "}
                            km
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                          <div className="i-ph:sunrise-bold text-primary text-xl mr-2"></div>
                          <span>
                            日出:
                            {formatTime(weatherData.sunrise, weatherData.timezone)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className="i-ph:sunset-bold text-primary text-xl mr-2"></div>
                          <span>
                            日落:
                            {formatTime(weatherData.sunset, weatherData.timezone)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 小时预报卡片 */}
                    <div className={$([
                      "p-6 rounded-2xl mb-6 overflow-x-auto",
                      "shadow shadow-primary/20 hover:shadow-primary/30 transition-shadow-500",
                      "bg-primary/5 dark:bg-primary/10",
                    ])}
                    >
                      <h3 className="text-xl font-bold mb-4">24小时预报</h3>
                      <div className="flex space-x-4 min-w-max pb-2">
                        {weatherData.hourly.map((hour, index) => (
                          <div
                            key={`hourly-${hour.time}-${index}`}
                            className={$([
                              "p-3 rounded-xl min-w-[80px]",
                              "bg-white/50 dark:bg-gray-800/50",
                              "flex flex-col items-center",
                            ])}
                          >
                            <p className="font-medium text-sm mb-1">{hour.time}</p>
                            <div className={`i-${hour.icon} text-2xl text-primary mb-1`}></div>
                            <p className="font-bold">{displayTemperature(hour.temp)}</p>
                            {hour.pop > 0
                              ? (
                                  <div className="flex items-center mt-1 text-xs text-blue-500">
                                    <div className="i-ph:drop-bold mr-1 text-xs"></div>
                                    <span>
                                      {hour.pop}
                                      %
                                    </span>
                                  </div>
                                )
                              : (
                                  <div className="flex items-center mt-1 text-xs text-gray-400">
                                    <div className="i-ph:drop-slash-bold mr-1 text-xs"></div>
                                    <span>0%</span>
                                  </div>
                                )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 天气预报卡片 */}
                    <div className={$([
                      "p-6 rounded-2xl",
                      "shadow shadow-primary/20 hover:shadow-primary/30 transition-shadow-500",
                      "bg-primary/5 dark:bg-primary/10",
                    ])}
                    >
                      <h3 className="text-xl font-bold mb-4">7天天气预报</h3>
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {weatherData.forecast.map((day, index) => (
                          <div
                            key={`forecast-${day.date}-${index}`}
                            className={$([
                              "p-4 rounded-xl",
                              "bg-white/50 dark:bg-gray-800/50",
                              "flex flex-col items-center",
                              index === 0 ? "md:bg-primary/10" : "",
                            ])}
                          >
                            <p className="font-medium mb-1">
                              {index === 0
                                ? "今天"
                                : day.dayOfWeek}
                            </p>
                            <p className="text-xs text-gray-500 mb-2">{day.date}</p>
                            <div className={`i-${day.icon} text-3xl text-primary mb-2`}></div>
                            <p className="text-sm mb-1">{day.description}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-red-500 font-bold">{displayTemperature(day.highTemp)}</span>
                              <span className="text-blue-500">{displayTemperature(day.lowTemp)}</span>
                            </div>
                            <div className="flex flex-col items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 w-full">
                              {day.pop > 0
                                ? (
                                    <div className="flex items-center mb-1 text-xs">
                                      <div className="i-ph:drop-bold mr-1 text-blue-500"></div>
                                      <span>
                                        {day.pop.toFixed(1)}
                                        {" "}
                                        mm
                                      </span>
                                    </div>
                                  )
                                : (
                                    <div className="flex items-center mb-1 text-xs">
                                      <div className="i-ph:drop-slash-bold mr-1 text-gray-400"></div>
                                      <span>0 mm</span>
                                    </div>
                                  )}
                              <div className="flex items-center text-xs">
                                <div className="i-ph:wind-bold mr-1 text-gray-500"></div>
                                <span>{day.windSpeed}</span>
                              </div>
                              <div className="flex items-center text-xs">
                                <div className="i-ph:gauge-bold mr-1 text-gray-500"></div>
                                <span>{day.windScale}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              : null}
    </div>
  )
}
