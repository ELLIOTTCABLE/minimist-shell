const debug    = require('debug')('minimist-shell:test')
    , describe = require('mocha').describe
    , it       = require('mocha').it
    , assert   = require('power-assert')

    , minimist_shell                   = require('../minimist-shell.es6.js')
    , { validate_opts, flatten_args }  = minimist_shell

assert.ok(process.env.MINIMIST_IMPL)
const minimist = require(process.env.MINIMIST_IMPL)
      minimist.pkg = process.env.MINIMIST_IMPL

describe("(with `"+minimist.pkg+"`)", function(){
   describe("flatten_args()", function(){ let opts, argv, result

      it("exists", function(){
         assert(typeof flatten_args === 'function')
      })

      it("doesn't throw, with empty arguments and options", function(){
         argv        = minimist('', opts = {})
         opts.shell  = validate_opts(opts)

         assert.doesNotThrow(() => flatten_args(argv, opts, opts.shell) )
      })

      it("validates options if not explicitly passed a pre-validated options-object", function(){
         argv        = minimist('', opts = {POSIX: 'invalid value!'})

         assert.throws(() => flatten_args(argv, opts) )
      })

   })
})
