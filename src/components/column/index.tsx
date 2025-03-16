import type { FixedColumnID } from "@shared/types"
import { useTitle } from "react-use"
import { metadata } from "@shared/metadata"
import { useAtom } from "jotai"
import { useEffect } from "react"
import { NavBar } from "../navbar"
import { Weather } from "../weather"
import { Dnd } from "./dnd"
import { currentColumnIDAtom } from "~/atoms"
import { AI } from "../ai"

export function Column({ id }: { id: FixedColumnID }) {
  const [currentColumnID, setCurrentColumnID] = useAtom(currentColumnIDAtom)
  useEffect(() => {
    setCurrentColumnID(id)
  }, [id, setCurrentColumnID])

  useTitle(`NewsDaily | ${metadata[id].name}`)

  return (
    <>
      <div className="flex justify-center md:hidden mb-6">
        <NavBar />
      </div>
      {id === "weather" ? (
        <Weather />
      ) : id === "hi" ? (
        <AI />
      ) : (
        id === currentColumnID && <Dnd />
      )}
    </>
  )
}
