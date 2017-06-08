#  This file demonstrates the types of errors `minimist-shell` can spit up when invoked incorrectly.

# 1. No config on STDIN
minimist $*

# 2. Invalid `minimist_shell()` argument
minimist $* <<<'{"shell": {"booleans": "NEVER SAY DIE!"}}'

# 3. Invalid `minimist()` argument
minimist $* <<<'{"string":"foo"}'

