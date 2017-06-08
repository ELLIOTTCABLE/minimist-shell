const debug    = require('debug')('minimist-shell:test')
    , describe = require('mocha').describe
    , it       = require('mocha').it
    , assert   = require('assert')

    , minimist_shell                   = require('../minimist-shell.es6.js')
    , { validate_opts, flatten_args }  = minimist_shell

assert.ok(process.env.MINIMIST_IMPL)
const minimist = require(process.env.MINIMIST_IMPL)
      minimist.pkg = process.env.MINIMIST_IMPL

describe("(with `"+minimist.pkg+"`)", function(){
   describe("validate_opts()", function(){

      // FIXME

   })

   describe("flatten_args()", function(){ let opts, argf, result

      it("exists", function(){
         assert(typeof flatten_args === 'function')
      })

      it("doesn't throw, with empty arguments and options", function(){
         argf        = minimist(['',''], opts = {})
         opts.shell  = validate_opts(opts)

         assert.doesNotThrow(() => flatten_args(argf, opts, opts.shell) )
      })

      it("validates options if not explicitly passed a pre-validated options-object", function(){
         argf = minimist('', opts = {POSIX: 'invalid value!'})

         assert.throws(() => flatten_args(argf, opts) )
      })

      it("returns a mapping", function(){
         argf        = minimist(['',''], opts = {})
         opts.shell  = validate_opts(opts)

         result = flatten_args(argf, opts, opts.shell)
         assert(typeof result === 'object')
      })

      it("maps simple string-ish flags directly", function(){
         argf        = minimist(['','', '--foo', 'bar'], opts = {})
         opts.shell  = validate_opts(opts)

         result = flatten_args(argf, opts, opts.shell)
         assert(result.foo === 'bar')
      })

   })
})
