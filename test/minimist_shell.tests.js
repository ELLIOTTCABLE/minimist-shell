const debug    = require('debug')('minimist-shell:test')
    , describe = require('mocha').describe
    , it       = require('mocha').it
    , assert   = require('assert')

    , minimist_shell                   = require('../minimist-shell.es6.js')

const  { validate_opts
       , flatten_args
       , SHELL_VALUE
       , ArgumentError
} = minimist_shell

assert.ok(process.env.MINIMIST_IMPL)
const minimist = require(process.env.MINIMIST_IMPL)
      minimist.pkg = process.env.MINIMIST_IMPL

describe("(with `"+minimist.pkg+"`)", function(){
   describe("validate_opts()", function(){

      it("exists", function(){
         assert(typeof validate_opts === 'function')
      })

      // FIXME

   })

   describe("flatten_args()", function(){ let opts, argf, result

      it("exists", function(){
         assert(typeof flatten_args === 'function')
      })

      it("doesn't throw, with empty arguments and options", function(){
         argf         = minimist(['',''], opts = {})
         opts.shell   = validate_opts(opts)

         assert.doesNotThrow(() => flatten_args(argf, opts, opts.shell) )
      })

      it("validates options if not explicitly passed a pre-validated options-object", function(){
         argf = minimist('', opts = {POSIX: 'invalid value!'})

         assert.throws(() => flatten_args(argf, opts) )
      })

      it("returns a mapping", function(){
         argf   = minimist(['',''], opts = {})

         result = flatten_args(argf, opts)
         assert(typeof result === 'object')
      })

      it("maps simple string-ish flags directly", function(){
         argf   = minimist(['','', '--foo', 'bar'], opts = {})

         result = flatten_args(argf, opts)
         assert(result.foo === 'bar')
      })

      it("leaves out undefined options", function(){
         argf      = minimist(['',''], opts = {})
         argf.foo  = undefined

         result    = flatten_args(argf, opts)
         assert(typeof result.foo === 'undefined')

         const flags = Object.keys(result)
         assert(flags.indexOf('foo') === -1)
      })

      it("maps numbers to strings (in the absence of `opts.typesets`)", function(){
         argf   = minimist(['','', '--foo', '1337'], opts = { number: ['foo'] })
         assert(typeof argf.foo === 'number')

         result = flatten_args(argf, opts)
         assert(typeof result.foo === 'string')
         assert(result.foo === '1337')
      })

      it("maps numbers to themselves with `opts.typesets`", function(){
         opts   = { number: ['foo'], shell: {typesets: true} }
         argf   = minimist(['','', '--foo', '1337'], opts)

         assert(opts.shell.typesets === true)
         assert(typeof argf.foo === 'number')

         result = flatten_args(argf, opts)
         assert(typeof result.foo === 'number')
         assert(result.foo === 1337)
      })

      it("maps boolean-true to a non-empty string (in the absence of `opts.booleans`)", function(){
         argf   = minimist(['','', '--foo'], opts = { boolean: ['foo'] })
         assert(typeof argf.foo === 'boolean')

         result = flatten_args(argf, opts)
         assert(typeof result.foo === 'string')
         assert(result.foo.length !== 0)
      })

      it("maps boolean-false to the empty string (in the absence of `opts.booleans`)", function(){
         argf   = minimist(['','', '--no-foo'], opts = { boolean: ['foo'] })
         assert(typeof argf.foo === 'boolean')

         result = flatten_args(argf, opts)
         assert(typeof result.foo === 'string')
         assert(result.foo.length === 0)
      })

      it("maps booleans to functions if so-configured by `opts.booleans`)", function(){
         opts   = { boolean: ['foo'], shell: {booleans: 'function'} }
         argf   = minimist(['','', '--foo'], opts)

         assert(opts.shell.booleans === 'function')
         assert(typeof argf.foo === 'boolean')

         result = flatten_args(argf, opts)
         assert(typeof result.foo === 'object')
         assert(result.foo[SHELL_VALUE])
      })

      it("maps booleans to any other pair of values configured via `opts.booleans`)", function(){
         opts   = { boolean: ['foo', 'bar'], shell: {booleans: {true: 'baz', false: 'widget'}} }
         argf   = minimist(['','', '--no-foo', '--bar'], opts)

         assert(typeof opts.shell.booleans === 'object')
         assert(typeof argf.foo === 'boolean')
         assert(typeof argf.bar === 'boolean')

         result = flatten_args(argf, opts)
         assert(typeof result.foo === 'string')
         assert(typeof result.bar === 'string')
         assert(result.foo === 'widget')
         assert(result.bar === 'baz')
      })

   })
})
