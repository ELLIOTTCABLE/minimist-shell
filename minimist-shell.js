var debug   = require('debug')('minimist-shell')

/**
Given an `argv`-object parsed by `minimist`, this function will return a string that, when
sourced by a Bourne-shell-derived `sh` (including `dash`, `bash`, and `zsh`), will expose the
command-line flags' values as shell variables.

    const opts = { alias: { foo: 'f' } }
        , argv =  require('minimist')( process.argv.slice(2), opts )
    console.dir(process.argv)  //=>  ['
    console.dir(argv)          //=>  { _: [], foo: "yay", f: "yay" }

    console.log( require('minimist-shell')(argv, opts) )
    // foo="yay" f="yay"

### Options
In addition<strong name="a1">[¹](#fn1)</strong> to the existing properties of the `opts` object
passed to `minimist()`, several `minimist-shell`-specific options may be included:

 - `"positionals":` [**Default:** `"none"`]
   The equivalent of `minimist`'s `argv._`, to a shell-script, are the [“positional parameters”][1]:
   `$1 ... $9`, `${10} ... ${N}`, and so on. I provide three ways to handle these:

   1. **`"none"`:** By default, `minimist_shell()` returns a script that only manipulates
      *variables* (that is ... scalar shell parameters whose names begin with `[a-zA-Z_-]`.)
      Positional parameters aren't re-exposed to the invoking shell-script in any way; although they
      are still available (in their original positions) in the shell's positional array:

          printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
          eval "$(minimist $* <<<'{"positionals":"none"}')"
          print "$path"                                //=> '/whee'
          printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'

   2. **`"set"`:** If instructed to, `minimist_shell()` will generate a command using the
      [POSIX `set -- ...` form][set]<strong name="a2">[²](#fn2)</strong> that resets the `$1 ...`
      positional-parameters to the positionals that `minimist()` stores in `argv._`.  Additionally,
      the *original* positional params are exposed in equivalently-named, prefixed variables, like
      `$__1`, `$__2`, and so on. Example:

          printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
          eval "$(minimist $* <<<'{"positionals":"set"}')"
          print "$path"                                //=> '/whee'
          printf "'%s' " "$__1" "$__2" "$__3" "$__4"   //=> 'foo' '--path' '/whee' 'bar'
          printf "'%s' " $# "$@"                       //=> '2' 'foo' 'bar'

   3. **`"prefix"`:** Effectively the inverse of `"set"`, this will set the prefixed-positional
      variables *instead* of using the `set` builtin, leaving the actual positional parameters
      unmodified:

          printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
          eval "$(minimist $* <<<'{"positionals":"prefix"}')"
          print "$path"                                //=> '/whee'
          printf "'%s' " "$__1" "$__2" "$__3" "$__4"   //=> 'foo' 'bar' '' ''
          printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'

 - `"booleans":` [**Default:** `""` — the empty string]
   There's [a handful of popular ways][2] to represent booleans, `true` and `false`, in shell-
   scripts; unfortunately, it's a common enough problem — and one with enough popular solutions —
   that I don't feel compfortable dictating a convention here, over configuration. Thus, there's
   three settings for this option:

   1. **The empty string, `""`.** The most common method (and the most robust), is to use string-
      length as a proxy for truthiness. In this system, the `[`/`test` builtin's `-z` (‘zero-
      length’) or `-n` (‘nonempty’) flags are used to determine truthiness in a boolean context,
      variables are left empty or null (undifferentiatedly) to indicate falseyness, and setting a
      variable to any arbitrary value indicates truthiness. `minimist_shell()` supports this by
      leaving `undefined` JavaScript values undefined in the shell output (thus, nullary) and
      setting `false` values to the empty string (`""`) (both of which `[ -n "$var" ]` will consider
      falsey); while setting `true` values to the string `"true"` (which `[ -n "$var" ]` will
      consider truthy.)

          printf "'%s' " $# "$@"                       //=> '2' '--foo' '--no-bar'
          eval "$(minimist $* <<<'{"booleans":""}')"
          printf "'%s' " "$foo" "$bar"                 //=> 'true' ''
          if [ -n "$foo" ] && [ -z "$bar" ]; then
             echo 'whee'; fi                           //=> whee

      (This is the most common method for a reason; and it is the one I, personally, as a relatively
       experienced shell-script author, would recommend.)

   2. **The string `"function"`.** The `if` construct in POSIX shell invokes the following function
      or command, and then tests the *exit code* thereof. The `[` (`test`) builtin is one common use
      of this functionality; but another are the builtin `true` and `false` *functions*, which
      simply immediately exit, providing a correspondingly-boolean exit-code. Such functions can be
      directly passed to `if` as commands (i.e. `if A_BOOLEAN; then ...` — note the lack of a `$`!);
      and `minimist_shell()` can generate shell-functions that behave this way for boolean flags:

          printf "'%s' " $# "$@"                       //=> '2' '--foo' '--no-bar'
          eval "$(minimist $* <<<'{"booleans":"function"}')"
          type foo bar                                 //=> foo is a shell function, bar is a shell ...
          if foo && ! bar; then
             echo 'whee'; fi                           //=> whee

      Although there are some security concerns with using this in shell-variables to represent
      boolean values more directly, it *is* convenient and somewhat more concise.

   3. **An array of precisely two strings, (i.e. `["yes", "no"]`).** Finally, sometimes, the most
      direct method, is comparing string-content equality in the shell. If given a tuple of string-
      words to represent `true` and `false`, `minimist_shell()` will simply set boolean-flag's
      variables directly to those provided values:

          printf "'%s' " $# "$@"                       //=> '2' '--foo' '--no-bar'
          eval "$(minimist $* <<<'{"booleans":["yes","no"]}')"
          printf "'%s' " "$foo" "$bar"                 //=> 'yes' 'no'
          if [ "$foo" = "yes" ] && [ "$bar" = "no" ]; then
             echo 'whee'; fi                           //=> whee

     (Of note, this is the only way out of the above for which it's easy to differentiate “absent”
      arguments, from “explicitly boolean-false” arguments.)

 - `"arrays":` [**Default:** `false`]
   By default, array-arguments (`--foo=A --foo=B` under @substack's `minimist`, or `rminimist`'s
   `"array"` configuration property) are exposed via index-suffixed scalar shell-variables:

       printf "'%s' " $# "$@"                          //=> '2' '--foo=123' '--foo=456'
       eval "$(minimist $* <<<'{"arrays":false}')"
       printf "'%s' " "$foo" "$foo0" "$foo1"           //=> '123' '123' '456'

   However, many modern shells support ‘array-type’ variables. By setting this configuration-option
   to `true`, you can instruct `minimist_shell()` to generate non-POSIX `typeset` declarations,
   creating shell-arrays to match `minimist()`-generated JavaScript arrays:

       printf "'%s' " $# "$@"                          //=> '2' '--foo=123' '--foo=456'
       eval "$(minimist $* <<<'{"arrays":true}')"
       typeset -p foo | head -n1                       //=> typeset -a foo # i.e. ‘foo is an array’
       printf "'%s' " "${#foo[@]}" "${foo[@]}"         //=> '2' '123' '456'

   (Of note, this is the only way to *iterate* list-style arguments in the shell; `minimist_shell()`
    makes no attempt at a scalar-variable proxy to array-length constructs like `${#foo[@]}`.)

 - `"associative_arrays":` [**Default:** `false`]
   Equivalent to `"arrays"`, but for very-modern<strong name="a3">[³](#fn3)</strong> associative-
   array support. When disabled, `minimist_shell()` attempts to flatten `minimist()`'s “object”-
   arguments to scalar variables, concatenating the object-path with double-underscores:

       printf "'%s' " $# "$@"                          //=> '2' '--ab.cd=123' '--ab.xy=456'
       eval "$(minimist $* <<<'{"associative_arrays":false}')"
       printf "'%s' " "$ab__cd" "$ab__xy"              //=> '123' '456'

   If enabled, though, `minimist_shell()` makes an attempt to map simple JavaScript objects to
   associative-array constructs:

       printf "'%s' " $# "$@"                          //=> '2' '--ab.cd=123' '--ab.xy=456'
       eval "$(minimist $* <<<'{"arrays":true}')"
       typeset -p ab | head -n1                        //=> typeset -A ab # i.e. ‘ab is a map’
       printf "'%s' " "${#ab[@]}" "$ab[cd]" "$ab[xy]"  //=> '2' '123' '456'

   It should be fairly obvious that both of these are fragile processes; keep your object-style
   arguments relatively simple. (This should go without saying *anyway*, honestly; and given that
   this is probably `minimist`'s least-used feature, I'm not going to spend too much love on
   perfecting the shell-script translation.)

 - `"typeset":` [**Default:** `false`]
   FIXME

 - `"uppercase":` [**Default:** `false`]
   Causes `$lowercase` variables to be duplicated in `$UPPERCASED` form as well.

   This option is provided because some shell-scripters prefer to write their scripts with all-
   uppercase variable naming; but it's off-by-default, as this is [considered ill-advised][3].

 - `"POSIX":` [**Default:** `true`]
   Although most modern shells are *derived* from the Bourne shell, they have come quite a long way
   in the intervening years. There's quite a few advanced features supported by recent versions of
   both the Z Shell and Bash; but using them can break scripts if they are executed on ancient
   (`sh`) or minimal (`dash`) interpreters.

   Writing Bash-style or sh-style scripts is largely a matter of taste. By default, `minimist-shell`
   generates widely-compatible shell-script (“POSIX sh”) wherever possible; but it can explicitly be
   instructed to take advantage of modern shell features where possible by passing `"POSIX": false`.

   Of note, several `minimist-shell` features are *explicitly for* such modern features; enabling
   any one of those implicitly enables `"posix": false` (and is incompatible with an explicitly-
   passed `"POSIX": true`.) The features that break POSIX compatibility are:

    - `"array": true`
    - `"associative_array": true`
    - `"typeset": true`

--- --- ---

1. <strong name="fn1">Nota bene:</strong> The original `opts` passed to `minimist()` *must* all be
   included; this is how `minimist_shell()` determines which arguments have been “declared”, and
   thus avoids stomping on them. <sub>[↩︎](#a1)</sub>

2. FIXME

3. <strong name="fn3">Very modern.</strong> Zsh has supported associative arrays for a while, but
   Bash only shipped support in v4.0 — which is still fairly rare in production. (For instance, as
   of this writing in mid-2017, macOS is still shipping with Bash **3.2**.) <sub>[↩︎](#a3)</sub>

   [1]: <http://wiki.bash-hackers.org/scripting/posparams>
      "Bash Hackers Wiki — Handling positional parameters"
   [2]: <https://unix.stackexchange.com/a/185680/12095>
      "What is a best practice to represent a boolean value in a shell script?"
   [3]: <https://unix.stackexchange.com/a/223599/12095>
      "Are there naming conventions for variables in shell scripts?"

   [set]: <http://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#set>
      "The Open Group Base Specifications / IEEE Std 1003.1-2008 — The `set` builtin"
 */
function minimist_shell(argv, opts){
   return '(>&2 printf "-- minimist_shell: results being evaluated\\n")'
}

module.exports = minimist_shell
