#!/usr/bin/env node
const debug           = require('debug')('minimist-shell:bin')
    , assert          = require('assert')
    , indent          = require('indent-string')
    , chalk           = require('chalk')

    , minimist_shell  = require('../minimist-shell.js')

chalk.enabled = true


var argv = process.argv.slice(2)
debug("original argv:\n%o", argv)

if (process.stdin.isTTY) no_config()
if (process.stdout.isTTY)
   debug("(STDOUT appears to be a TTY?)")

debug("reading options")
process.stdin.pipe(require('concat-stream')(function(buffer){ var config, minimist, script
   buffer = buffer.toString()
   if (buffer.trim().length === 0) no_config()

   config = JSON.parse(buffer)
   debug("parsing argv with options:\n%O", config)

   minimist = config.minimist_package || '_non_existent_package'
   try {
      minimist = require(minimist) }
   catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e

      try {
         minimist = require('rminimist') }
      catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e

         try {
            minimist = require('minimist') }
         catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e

            console.error("!! minimist-shell: `minimist-shell` must be installed alongside an "+
               "implementation of `minimist`.")
            console.error("  (Try `npm install rminimist`!)")
            process.exit(10)
   }}}

   argv = minimist(argv, config)
   debug("parsing argv result:\n%O", argv)

   try {
      script = minimist_shell(argv, config) }
   catch(e) {
      fail(e) }

   debug("generated script, printing it to calling shell")
   console.log(script)
}))

function no_config(){
   const e = new Error("!! minimist-shell: No config provided on standard-input.")

   e.lines = [e.message
    , "   Make sure to redirect the config from a file upon invocation:"
    , ""
    , "      minimist $* <stuff/config.json"
    , ""]

   fail(e)
}

//haha janky tho
function fail(err){
   const message   = err.message.split("\n")
       , stack     = err.stack.split("\n").map(line => line.trim())

   console.error( chalk.red(  chalk.bold('!! ') + message[0]         )  )
   console.error(             indent(message.slice(1).join("\n"), 3)    )

   console.error( chalk.grey( chalk.bold('!! ') + stack[0]           )  )
   console.error( chalk.grey( indent(stack.slice(1).join("\n"), 3)   )  )
   process.exit(51)
}
