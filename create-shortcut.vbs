Set WshShell = CreateObject("WScript.Shell")
DesktopPath = WshShell.SpecialFolders("Desktop")
Set Shortcut = WshShell.CreateShortcut(DesktopPath & "\NewsNow.lnk")
Shortcut.TargetPath = "e:\Windsurf\project\newsnow-main\newsnow-main\start-newsnow.bat"
Shortcut.WorkingDirectory = "e:\Windsurf\project\newsnow-main\newsnow-main"
Shortcut.Description = "Launch NewsNow Project"
Shortcut.IconLocation = "e:\Windsurf\project\newsnow-main\newsnow-main\public\favicon.ico"
Shortcut.Save
