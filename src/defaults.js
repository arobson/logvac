const fount = require( "fount" );

module.exports = {
  fount: fount,
  transforms: [ "./src/transforms/*.js" ],
  transports: [ "./src/transports/*.js" ],
  scanFrequency: 3000,
  containerLogs: "/var/log/containers",
  logPath: "/var/log/",
  positionFile: "logvac.json"
};