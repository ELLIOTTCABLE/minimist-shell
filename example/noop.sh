#  The simplest possible example — this simply invokes `minimist-shell` with no arguments, and does
#  nothing with the stdout.
#
#  This can be used to examine `minimist_shell()`'s logic for a given set of arguments by using
#  `node-debug`'s `$DEBUG` env-var:
#
#      $ DEBUG='minimist-shell' \
#           ./example/noop.sh --foo --no-bar
#        minimist-shell options compiled; result:
#        minimist-shell { positionals: 'none',
          # ...
#        minimist-shell   POSIX: true } +0ms
#        minimist-shell flags compiled; result:
#        minimist-shell { foo: 'true', bar: '' } +6ms
#        minimist-shell script compiled; result:
#        minimist-shell   foo='true'
#        minimist-shell   bar='' +2ms

minimist $* <<<'{}' >&-
