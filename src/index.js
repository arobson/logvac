const _ = require( "lodash" );
const when = require( "when" );

const defaults = require( "./defaults" );

function initialize( supplied ) {
  let config = normalizeConfig( supplied );
  let fount = config.fount;

  fount.register( "fount", fount );
  fount.register( "config", config );

  let logs = require( "./logs" )( config );

  let state = {
    config: config,
    fount: fount,
    modlo: require( "modlo" )( { fount: fount } ),
    snap: require( "snapstack" )( { fount: fount } ),
    stacks: { default: null },
    logs: logs,
    transforms: {},
    transports: {},
    streams: {},
    entries: logs.getInitialEntries()
  };
  state.dispatch = require( "./dispatcher" )( state );
  state.start = start.bind( null, state );
  state.stop = stop.bind( null, state );

  let promises = [
    loadTransforms( state ),
    loadTransports( state )
  ];

  return when.all( promises )
    .then( () => state )
    .then( initializeTransports )
    .then( initializeStacks );
}

function initializeStacks( state ) {
  // for now, there can be only one
  let stack = state.snap.stack( "default" );
  let tokenize = require( "./tokenizer" )( state.config ).transform;

  // begin stack with the tokenizer
  stack.append( tokenize );
  _.each( state.transforms, ( transform ) => {
    stack.append( transform.transform );
  } );

  // add transports to stack
  _.each( state.transports, ( transport ) => {
    stack.append( transport.transfer );
  } );

  state.stacks.default = stack;
  return when( state );
}

function initializeTransports( state ) {
  let promises = _.map( state.transports, ( transport ) => {
    return transport.connect();
  } );
  return when.all( promises )
    .then( () => state );
}

function loadTransforms( state ) {
  return loadExtensions( state, "transforms" );
}

function loadTransports( state ) {
  return loadExtensions( state, "transports" );
}

function loadExtensions( state, type ) {
  let list = state.config[ type ];
  let files = [];
  let names = [];
  let container = state.config.fount;
  _.each( list, function( x ) {
    if( /[\/]/.test( x ) ) {
      files.push( x );
    } else {
      names.push( x );
    }
  } );
  if( files.length === 0 && names.length === 0 ) {
    return when( {} );
  }
  return state.modlo
    .load( {
      patterns: files,
      modules: names
    } )
    .then( function( result ) {
      let promises = _.map( result.loaded, function( extension ) {
        return container
          .resolve( extension )
          .then(
            ( result ) => {
              result.name = result.name || extension;
              state[ type ][ extension ] = result;
              return {
                key: extension,
                value: result
              };
            },
            ( err ) => {
              console.log( "an error occurred loading", extension, err );
            }
          );
      } );
      return when.all( promises )
        .then( function( extensions ) {
          return _.reduce( extensions, function( acc, extension ) {
            acc[ extension.key ] = extension.value;
            return acc;
          }, {} );
        } );
    } )
    .then( () => state );
}

function normalizeConfig( supplied ) {
  supplied.plugins = toArray( supplied.plugins );
  supplied.middleware = toArray( supplied.middleware );
  supplied.resources = toArray( supplied.resources );
  supplied.transports = toArray( supplied.transports );
  return Object.assign( {}, defaults, supplied );
}

function toArray( value ) {
  return _.isString( value ) ? [ value ] : ( value || [] );
}

function start( state ) {
  state.dispatch.start();
}

function stop( state ) {
  state.dispatch.stop();
}

module.exports = {
  init: initialize
}
