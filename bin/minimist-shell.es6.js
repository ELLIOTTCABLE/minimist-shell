#!/usr/bin/env node
const debug              = require('debug')('minimist-shell:bin')
    , assert             = require('assert')
    , indent             = require('indent-string')
    , chalk              = require('chalk')

    , minimist_shell     = require('../minimist-shell.js')
    , { ArgumentError }  = minimist_shell



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
      minimist = require(minimist)
      debug("using `opts.minimist_package`: '"+minimist+"'") }
   catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e

      if (config.minimist_package)
         debug("`opts.minimist_package` MISSING! '"+minimist+"'")

      try {
         minimist = require('rminimist')
         debug("using @rstacruz's 'rminimist' implementation") }
      catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e

         try {
            minimist = require('minimist')
            debug("using @substack's 'minimist' implementation") }
         catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e
            print_error( multiline_error(new ArgumentError
             , "minimist-shell: No `minimist()` package found."
             , "`minimist-shell` must be installed alongside an implementation of `minimist`."
             , "(Try "+chalk.inverse("`npm install rminimist`")+"!)" ))

            process.exit(11)
   }}}

   argv = minimist(argv, config)
   debug("parsing argv result:\n%O", argv)

   try {
      script = minimist_shell(argv, config) }
   catch(e) {
      print_error(e)
      process.exit(12)
   }

   debug("generated script, printing it to calling shell")
   console.log(script)
}))

function no_config(){
   // FIXME: This example should show correct shell-sourcing behaviour
   print_error( multiline_error(new ArgumentError
    , "minimist-shell: No config provided on standard-input!"
    , "Make sure to redirect the config from a file upon invocation:"
    , chalk.inverse("                                      ")
    , chalk.inverse("    minimist $* <stuff/config.json    ")
    , chalk.inverse("                                      ") ))

   process.exit(10)
}

function multiline_error(error, ...lines){
   error.message = lines.join("\n")

   return error
}

//haha janky tho
function print_error(err){
   const message   = err.message.split("\n")
       , stack     = err.stack.split("\n").map(line => line.trim())

   console.error( chalk.red(  chalk.bold('!! ') + message[0]         )  )
   if (message.length > 1)
   console.error(             indent(message.slice(1).join("\n"), 3)    )

   console.error( chalk.grey( chalk.bold('!! ') + stack[0]           )  )
   console.error( chalk.grey( indent(stack.slice(1).join("\n"), 3)   )  )
}
