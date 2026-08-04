; Krypt LARP NSIS installer add-ons.
; Loaded by electron-builder (see package.json -> build.nsis.include).

!macro customUnInstall
  ; The app enforces a "start with Windows" login item on every launch
  ; (electron/autostart.js). Electron writes that to the per-user Run key,
  ; and nothing removes it on uninstall — leaving Windows to try launching
  ; a deleted exe at every boot. Clean it up here.
  ;
  ; The value name must match LOGIN_ITEM_NAME in electron/autostart.js.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Krypt LARP"

  ; Older installs registered under the executable name instead.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "krypt-larp"
!macroend
