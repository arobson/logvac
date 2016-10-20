var chai = require( 'chai' );
chai.use( require( 'chai-as-promised' ) );
global.should = chai.should();
global.expect = chai.expect;
var _ = global._ = require( 'lodash' );
global.when = require( 'when' );
global.lift = require( 'when/node' ).lift;
global.seq = require( 'when/sequence' );
global.fs = require( 'fs' );
global.path = require( 'path' );

global.sinon = require( 'sinon' );
require( "sinon-as-promised" );
var sinonChai = require( 'sinon-chai' );
chai.use( sinonChai );

// global.proxyquire = require( 'proxyquire' ).noPreserveCache();

function deepCompare( a, b, k ) {
  var diffs = [];
  if ( b === undefined ) {
    diffs.push( "expected " + k + " to equal " + a + " but was undefined " );
  } else if ( _.isObject( a ) || _.isArray( a ) ) {
    _.each( a, function( v, c ) {
      var key = k ? [ k, c ].join( "." ) : c;
      diffs = diffs.concat( deepCompare( a[ c ], b[ c ], key ) );
    } );
  } else {
    var equal = a == b; // jshint ignore:line
    if ( !equal ) {
      diffs.push( "expected " + k + " to equal " + a + " but got " + b );
    }
  }
  return diffs;
}

chai.Assertion.addMethod( "partiallyEql", function( partial ) {
  var obj = this._obj;
  if ( !obj.then ) {
    obj = when.resolve( obj );
  }
  var self = this;
  return obj.then( function( actual ) {
    var diffs = deepCompare( partial, actual );
    return self.assert(
    diffs.length === 0,
    diffs.join( "\n\t" )
    );
  } );
} );