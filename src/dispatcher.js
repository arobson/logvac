const _ = require( "lodash" );
const readline = require( "readline" );
const fullLine = /[}](\r)?(\n)?$/;

function checkInterfaces( state ) {
  _.each( state.streams, ( stream ) => {
    if( !stream.reader ) {
      let reader = readline.createInterface( {
        input: stream.stream
      } );
      stream.fragment = "";
      stream.reader = reader;
      reader.on( "line", ( raw ) => {
        if( fullLine.test( raw ) && raw.trim() !== "" ) {
          stream.charactersRead += (raw.length + 1);
          raw = stream.fragment + raw;
          stream.fragment = "";
          let line = JSON.parse( raw );
          line._filename = stream.file;
          state.stacks.default.execute( {}, line )
            .then( () => updatePosition( state, stream ) );
        } else {
          stream.charactersRead += raw.length;
          stream.fragment += raw.trim();
        }
      } );
      reader.on( "close", () => {
        stream.reader = undefined;
      } );
    }
  } );
  setTimer( state );
}

function refresh( state ) {
  return state.logs.getAllStreams( state.streams )
    .then( ( streams ) => {
      state.streams = streams;
      return checkInterfaces( state );
    } );
}

function setTimer( state ) {
  state.pendingTimeout = setTimeout( function() {
    refresh( state );
  }, state.config.scanFrequency );
}

function start( state ) {
  return refresh( state );
}

function stop( state ) {
  if( state.pendingTimeout ) {
    clearTimeout( state.pendingTimeout );
  }
}

function updatePosition( state, stream ) {
  state.entries[ stream.file ] = stream.charactersRead;
  state.logs.storeLastEntries( state.entries );
}

module.exports = function( state ) {
  return {
    checkInterfaces: checkInterfaces.bind( null, state ),
    refresh: refresh.bind( null, state ),
    setTimer: setTimer.bind( null, state ),
    start: start.bind( null, state ),
    stop: stop.bind( null, state ),
    updatePosition: updatePosition.bind( null, state )
  }
}
