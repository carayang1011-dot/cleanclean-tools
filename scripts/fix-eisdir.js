// Patch fs.readlink so EISDIR is treated as EINVAL (for Windows filesystem quirk)
const fs = require('fs')

const orig = fs.readlink.bind(fs)
fs.readlink = function (path, options, callback) {
  if (typeof options === 'function') { callback = options; options = {} }
  orig(path, options, function (err, link) {
    if (err && err.code === 'EISDIR') {
      const e = Object.assign(new Error(`EINVAL: invalid argument, readlink '${path}'`), { code: 'EINVAL', syscall: 'readlink', path })
      return callback(e)
    }
    callback(err, link)
  })
}

const origSync = fs.readlinkSync.bind(fs)
fs.readlinkSync = function (path, options) {
  try {
    return origSync(path, options)
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      const e = Object.assign(new Error(`EINVAL: invalid argument, readlink '${path}'`), { code: 'EINVAL', syscall: 'readlink', path })
      throw e
    }
    throw err
  }
}
