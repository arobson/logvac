const _ = require( "lodash" );
const path = require( "path" );
const when = require( "when" );

/*
 * `namespace` - the namespace of the Pod that emitted the message
 * `service` - the friendly name of the Pod that emitted the message
 * `system` - the combined namespace + name of the Pod
 * `pod` - the unique id of the Pod (to differentiate from multiple instances)
 * `container` - 12 character slug of the container's sha
 * `daemon` - the docker daemon/VM host IP the message was collected from
 */

function tokenizeLogName( config, entry ) {
  let [ pod, namespace, container ] = path.basename( entry._filename ).split( "_" );
  let containerParts = container.split( "-" );
  let serviceName = containerParts.slice( 0, -1 ).join( "-" );
  let slug = containerParts[ containerParts.length - 1 ].substring( 0, 12 );
  let system = [ namespace, serviceName ].join( "." );
  entry.pod = pod;
  entry.service = serviceName;
  entry.namespace = namespace;
  entry.system = system;
  entry.hostname = system;
  entry.container = slug;
  return when();
}

module.exports = function( config ) {
  return {
    transform: tokenizeLogName.bind( null, config )
  };
}
