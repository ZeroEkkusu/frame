const { app, ipcMain, protocol, shell, dialog } = require('electron')
app.commandLine.appendSwitch('force-gpu-rasterization', true)

const log = require('electron-log')
const path = require('path')

const windows = require('./windows')
const store = require('./store')

// Action Monitor
// store.api.feed((state, actions, obscount) => {
//   console.log(actions)
// })

const accounts = require('./accounts')
const launch = require('./launch')
const updater = require('./updater')
require('./rpc')
const clients = require('./clients')
const signers = require('./signers')
const persist = require('./store/persist')

log.info('Chrome: v' + process.versions.chrome)
log.info('Electron: v' + process.versions.electron)
log.info('Node: v' + process.versions.node)

process.on('uncaughtException', (e) => {
  if (e.code === 'EADDRINUSE') {
    dialog.showErrorBox('Frame is already running', 'Frame is already running or another appication is using port 1248.')
  } else {
    dialog.showErrorBox('An error occured, Frame will quit', e.message)
  }
  log.error('uncaughtException')
  log.error(e)
  // Kill all clients running as child processes
  clients.stop()
  throw e
  // setTimeout(() => app.quit(), 50)
})

const externalWhitelist = [
  'https://frame.sh',
  'https://chrome.google.com/webstore/detail/frame-alpha/ldcoohedfbjoobcadoglnnmmfbdlmmhf',
  'https://github.com/floating/frame/issues/new',
  'https://gitter.im/framehq/general',
  'https://github.com/floating/frame/blob/master/LICENSE'
]

global.eval = () => { throw new Error(`This app does not support global.eval()`) } // eslint-disable-line

ipcMain.on('tray:resetAllSettings', () => {
  persist.clear()
  if (updater.updatePending) return updater.quitAndInstall(true, true)
  app.relaunch()
  app.exit(0)
})

ipcMain.on('tray:removeAllAccountsAndSigners', () => {
  signers.removeAllSigners()
  accounts.removeAllAccounts()
})

ipcMain.on('tray:installAvailableUpdate', (e, install, dontRemind) => {
  updater.installAvailableUpdate(install, dontRemind)
})

ipcMain.on('tray:verifyAddress', (e) => {
  accounts.verifyAddress(true)
})

ipcMain.on('tray:removeAccount', (e, id) => {
  signers.remove(id)
  accounts.remove(id)
})

ipcMain.on('tray:removeSigner', (e, id) => {
  signers.remove(id)
})

ipcMain.on('tray:openExternal', (e, url) => {
  if (externalWhitelist.indexOf(url) > -1) shell.openExternal(url)
})

const networks = { 1: '', 3: 'ropsten.', 4: 'rinkeby.', 42: 'kovan.' }
ipcMain.on('tray:openEtherscan', (e, hash) => {
  const network = networks[store('main.connection.network')]
  shell.openExternal('https://' + network + 'etherscan.io/tx/' + hash)
})

ipcMain.on('tray:giveAccess', (e, req, access) => {
  store.giveAccess(req, access)
  accounts.removeRequest(req.handlerId)
})

ipcMain.on('tray:syncPath', (e, path, value) => {
  store.syncPath(path, value)
})

ipcMain.on('tray:ready', () => require('./api'))

ipcMain.on('tray:updateRestart', () => {
  updater.quitAndInstall(true, true)
})

ipcMain.on('tray:refreshMain', () => windows.broadcast('main:action', 'syncMain', store('main')))

if (process.platform !== 'darwin' && process.platform !== 'win32') app.disableHardwareAcceleration()
app.on('ready', () => {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    windows.tray()
  } else {
    setTimeout(windows.tray, 20)
  }
  if (app.dock) app.dock.hide()
  protocol.interceptFileProtocol('file', (req, cb) => {
    const appOrigin = path.resolve(__dirname, '../')
    const filePath = path.resolve(__dirname, req.url.replace(process.platform === 'win32' ? 'file:///' : 'file://', ''))
    if (filePath.startsWith(appOrigin)) cb({path: filePath}) // eslint-disable-line
  })
})

ipcMain.on('tray:action', (e, action, ...args) => {
  if (store[action]) return store[action](...args)
  log.info('Tray sent unrecognized action: ', action)
})

app.on('activate', () => windows.activate())
app.on('will-quit', () => app.quit())
app.on('quit', async () => {
  await clients.stop()
  accounts.close()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

let launchStatus = store('main.launch')
store.observer(() => {
  if (launchStatus !== store('main.launch')) {
    launchStatus = store('main.launch')
    launchStatus ? launch.enable() : launch.disable()
  }
})
