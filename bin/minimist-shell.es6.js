#!/usr/bin/env node
const debug           = require('debug')('minimist-shell:bin')
    , assert          = require('assert')
    , minimist_shell  = require('../minimist-shell.js')


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
      throw_multiline_error(e) }

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

   throw_multiline_error(e)
}

//haha janky tho
function throw_multiline_error(error){
   console.error(error.message)
   if (error.lines)
      error.lines.forEach(console.error)
   console.error(error.stack.split("\n").slice(1).join("\n"))
   process.exit(51)
}
