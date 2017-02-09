var debounce = require('.')
var sinon = require('sinon')

describe('housekeeping', function() {
  it('should be defined as a function', function() {
    expect(typeof debounce).toEqual('function')
  })
})

describe('catch issue #3 - Debounced function executing early?', function() {

  // use sinon to control the clock
  var clock

  beforeEach(function(){
    clock = sinon.useFakeTimers()
  })

  afterEach(function(){
    clock.restore()
  })

  it('should debounce with fast timeout', function() {

    var callback = sinon.spy()

    // set up debounced function with wait of 100
    var fn = debounce(callback, 100)

    // call debounced function at interval of 50
    setTimeout(fn, 100)
    setTimeout(fn, 150)
    setTimeout(fn, 200)
    setTimeout(fn, 250)

    // set the clock to 100 (period of the wait) ticks after the last debounced call
    clock.tick(350)

    // the callback should have been triggered once
    expect(callback.callCount).toEqual(1)

  })

})
