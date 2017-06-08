#  A simple example of slighyly-more-realistic usage, with a real config-file; here, I'm simply
#  letting the shell-code dump to STDOUT.

cat <<CONFIG.JSON >example/config.json
   {
      "shell": {
         "positionals": "set"
       , "booleans": {"true": "yes", "false": "no"}
       , "uppercase": true
      }
   }
CONFIG.JSON

minimist $* <example/config.json
