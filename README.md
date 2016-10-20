## logvac
A simple log aggregator purpose built for kubernetes.

> "But FluentD" - Everyone

I was surprised that Fluent and its plugins are written with the core assumption that the daemon's context is the service's host. When it isn't, there's a serious penalty, all log entries get built up from the Docker Daemon *host* or, worse, "localhost". While I found the message body could be decorated, this does _not_ allow you to take advantage of categorization and grouping and increases the effort and cost of searching the logs. Why even bother aggregating?

logvac is built specifically for kubernetes which means it already knows about about kubelet's lovely symbolic link trick at `/var/log/containers` and exploits that so that the log stream it produces not only has that information available, but so that all transformers and transports have log entries from the context of the Docker Container that includes the larger context of the cluster as well.

## Log Stream
logvac produces a log stream of JSON entries. This should be unsurprising given that:
 * that's the Docker logfile format
 * this is a Node project
 * decorating a message with metadata is easier this way

### Metadata
These properties are added to the Docker message payload (which has the properties `log`, `stream` and `time`):

 * `namespace` - the namespace of the service that emitted the message
 * `service` - the name of the service that emitted the message
 * `system` - the combined namespace + name of the service
 * `pod` - the unique id of the Pod (to differentiate from multiple instances)
 * `container` - 12 character slug of the container's sha

## Plugins
logvac's plugin system is simpler and supports message transforms and message transports.

Plugins can be written either as NPM modules or included as modules in the project itself.

### Transforms
A transform is a JS module that takes a configuration block and exposes a `transform` function which takes a single log entry and makes a change to it. The entry, or a promise should be returned at the end of the function.

```js
function iDoTheThing( config, entry ) {
  // something super important with the config and the entry
  return entry;
}

module.exports = function myTransform( config ) {
  return {
    transform: iDoTheThing.bind( null, config )
  };
}
```

### Transports
A transform is a JS module that takes a configuration block and exposes a `transfer` function. Both the module and the transfer function can return either a simple value or a promise to resolve. In the case of the transfer function, the promise's resolution is what tells logvac that the log entry can be considered successfully transfered so that it will not be retried again in the future.

If the transport is a valid event emitter, logvac will subscribe to `connected` and `disconnected` events. It will use this to halt and resume log parsing activities and avoid crashes due to OOMs.

Plugging in transports that don't provide this facility and cannot reach the inended end-points will lead to logvac crashing and starting over.

```js
function upload( config, entry ) {
  // something super important with the config and the entry
  return entry;
}

function connect( config ) {
  // connects to some aggregator based on config
  return when();
}

module.exports = function myTransform( config ) {
  return {
    connect,
    transfer.bind( null, config )
  };
}
```

## Configuration
logvac has several core configuration values that are unlikely to change from one installation to the next. Should you need to change them, simply provide a matching property when supplying the config block with a different value:

```js
{
  transforms: [ "./src/transforms/*.js" ],
  transports: [ "./src/transports/*.js" ],
  containerLogs: "/var/log/containers",
  logPath: "/var/log/",
  positionFile: "logvac.json"
}
```

## Use
Using logvac to create your own service is really simple. Here's a quick example:

```bash
npm init
npm install logvac logvac-papertrail -S
```

### src/config.js
```js
require( "dot-env" );

module.exports = {
  "transforms": [ "./src/transforms/*.js" ]
  "transports": [ "logvac-papertrail" ],
  "papertrail": {
    "url": process.env[ "PAPERTRAIL_URL" ],
    "port": process.env[ "PAPERTRAIL_PORT" ],
    "level": process.env[ "LOG_LEVEL" ],
    "interval": process.env[ "LOG_FREQUENCY" ]
  }
};
```

### src/index.js
```js
require( "logvac" );
const config = require( "./config" );

logvac.init( config )
  .then( ( service ) => {
    return service.start();
  } );
```