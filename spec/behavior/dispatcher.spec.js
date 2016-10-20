require( "../setup" );

const stream = require( "stream" );
const dispatchFn = require( "../../src/dispatcher" );

describe( "Dispatcher", () => {

  describe( "when starting dispatcher", () => {
    describe( "without any streams", () => {
      let logs = {
        getAllStreams: _.noop
      };

      let logMock = sinon.mock( logs );
      let state = {
        streams: {},
        logs: logs,
        stacks: { default: null },
        config: { scanFrequency: 10000 }
      };
      let dispatch = dispatchFn( state );

      before( () => {
        logMock
          .expects( "getAllStreams" )
          .once()
          .resolves( {} );

        dispatch.start();
      } );

      it( "should set timeout", () => {
        state.pendingTimeout.should.not.be.null;
      } );

      it( "should have called logs.getAllStreams", () => {
        return logMock.verify();
      } );

      after( () => {
        dispatch.stop();
      } );
    } );

    describe( "with streams", () => {
      let logs = {
        getAllStreams: _.noop,
        storeLastEntries: _.noop
      };
      let logMock = sinon.mock( logs );
      
      let stack = {
        execute: _.noop
      };
      let stackMock = sinon.mock( stack );

      let state = {
        streams: {},
        logs: logs,
        entries: {},
        stacks: { default: stack },
        config: { scanFrequency: 10000 }
      };
      let dispatch = dispatchFn( state );

      before( () => {
        let tempStream = new stream.Readable();
        tempStream._read = () => {};

        stackMock
          .expects( "execute" )
          .once()
          .withArgs( 
            {},
            { 
              log: "this is a test",
              _filename: "fake"
            }
          )
          .resolves();

        logMock
          .expects( "getAllStreams" )
          .once()
          .resolves( {
            fake: {
              file: "fake",
              start: 0,
              charactersRead: 0,
              stream: tempStream
            }
          } );

        logMock
          .expects( "storeLastEntries" )
          .once()
          .withArgs( {
            fake: 25
          } )
          .resolves();

        dispatch.start();
        tempStream.push( '{"log":"this is a test"}\n' );
      } );

      it( "should set timeout", () => {
        state.pendingTimeout.should.not.be.null;
      } );

      it( "should call stack.execute", () => {
        return stackMock.verify()
      } );

      it( "should have called logs.getAllStreams, logs.storeLastEntries", () => {
        return logMock.verify();
      } );

      after( () => {
        dispatch.stop();
      } );
    } );
  } );

  describe( "when calling stop without start or a set timer", () => {
    let dispatch = dispatchFn( {} );
    it( "should not throw an error", () => {
      dispatch.stop();
    } );
  } );
} );