' REVACHOL site — hidden launcher for serve-forever.cmd (no console window).
Set sh = CreateObject("WScript.Shell")
' serve-forever.cmd sits beside this file, wherever the site lives
here = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run """" & here & "\serve-forever.cmd""", 0, False
