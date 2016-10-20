const _ = require( "lodash" );
const fs = require( "fs" );
const path = require( "path" );
const when = require( "when" );

function getLastEntries( positionFile ) {
  return when.promise( ( res, rej ) => {
    fs.readFile( positionFile, "utf8", ( err, content ) => {
      if( err ) {
        rej( err );
      } else {
        try {
          let json = JSON.parse( content.toString() );
          res( json );
        } catch( e ) {
          console.log( "read from position file was invalid, retrying ..." );
          res( getLastEntries( positionFile ) );
        }
      }
    } );
  } );
}

function getInitialEntries( positionFile ) {
    try {
      let content = fs.readFileSync( positionFile, "utf8" );
      let json = JSON.parse( content.toString() );
      return json;
    } catch( e ) {
      return {};
    }
}

function listFiles( logPath ) {
  return when.promise( ( res, rej ) => {
    fs.readdir( logPath, ( err, files ) => {
      if( err ) {
        rej( err );
      } else {
        let list = _.map( files, ( file ) => path.resolve( logPath, file ) );
        res( list );
      }
    } );
  } );
}

function getNewReadStream( containerLogs, logFile, positions ) {
  let fullPath = path.resolve( containerLogs, logFile );
  let start = positions[ logFile ];
  let rs = fs.createReadStream( fullPath, {
    start: start || 0
  } );
  return {
    stream: rs,
    start: start,
    charactersRead: start,
    file: logFile,
    fullPath: fullPath
  };
}

function getAllStreams( positionFile, logPath, streams ) {
  return getLastEntries( positionFile )
    .then(
      ( positions ) => {
        return listFiles( logPath )
          .then( ( files ) => {
            return { positions, files };
          } );
      },
      () => {
        return listFiles( logPath )
          .then( ( files ) => {
            return { positions: {}, files };
          } );
      } )
    .then( ( context ) =>
      _.reduce( context.files, ( acc, file ) => {
        if( !acc[ file ] ) {
          acc[ file ] = getNewReadStream( logPath, file, context.positions );
        } else if ( acc[ file ].stream.closed || !acc[ file ].stream.readable ) {
          // just refresh the stream, but don't replace the start position
          refreshReadStream( acc[ file ] );
        }
        return acc;
      }, streams || {} )
    );
}

function refreshReadStream( stream ) {
  stream.stream = fs.createReadStream( stream.fullPath, {
    start: stream.charactersRead
  } );
}

function storeLastEntries( positionFile, entries ) {
  return when.promise( ( res, rej ) => {
    fs.writeFile( positionFile, JSON.stringify( entries ), "utf8", ( err ) => {
      if( err ) {
        rej( err );
      } else {
        res();
      }
    } );
  } );
}

module.exports = function( config ) {
  const positionFile = path.resolve( config.logPath, config.positionFile );
  return {
    getAllStreams: getAllStreams.bind( null, positionFile, config.containerLogs ),
    getInitialEntries: getInitialEntries.bind( null, positionFile ),
    getLastEntries: getLastEntries.bind( null, positionFile ),
    getNewReadStream: getNewReadStream,
    listFiles: listFiles.bind( null, config.containerLogs ),
    storeLastEntries: storeLastEntries.bind( null, positionFile )
  };
}
