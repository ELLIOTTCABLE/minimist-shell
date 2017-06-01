const debug    = require('debug')('minimist-shell')
    , _        = require('lodash')


const valid_shell_variable = /[A-Za-z_][A-Za-z0-9_]*/


/**
 * Given an `argv`-object parsed by `minimist`, this function will return a string that, when
 * sourced by a Bourne-shell-derived `sh` (including `dash`, `bash`, and `zsh`), will expose the
 * command-line flags' values as shell variables.
 *
 *     const opts = { alias: { foo: 'f' } }
 *         , argv =  require('minimist')( process.argv.slice(2), opts )
 *     console.dir(process.argv)  //=>  ['--foo=yay']
 *     console.dir(argv)          //=>  { _: [], foo: "yay", f: "yay" }
 *
 *     console.log( require('minimist-shell')(argv, opts) )
 *     // foo="yay" f="yay"
 *
 * (Further invocation information and usage is down below.)
 *
 * In particular, `minimist_shell()` attempts to generate shell-code according to these
 * philosophies:
 *
 *  - I'm 1. generating 2. stringly-typed code for 3. one of the world's [most notoriously fragile
 *    languages][1] based on 4. direct user-input in 5. a knocked-off-in-a-week-ish (I hope? ... ask
 *    me in a week.) library written by 6. one dude 7. in his free time.
 *
 *    **This is not secure. This will not be secure. Do not use this for things that need to be
 *    secure.** (In particular, if you ever type `eval "$(minimist ...)"` in a script run via
 *    `sudo`, I will personally hunt you down and scold you. Scold. With the wagging finger and
 *    *everything*.)
 *
 *  - I've spent the lion's share of my time working in shells straining to write POSIX-compatible
 *    code. Some would argue that this is unnecessary nowadays (especially for the types of tasks
 *    for which `minimist` is likely to be used on the command-line — in developer's terminals,
 *    while contributing to (or using) JavaScript projects, in super-modern, up-to-date, and
 *    tricked-out `zsh`es and Bashes); but experience has taught me that it's way easier to use
 *    something unnecessarily POSIX-strict in a modern-shell setting, than it is to use something
 *    written for modern shells in a POSIX-sh setting.
 *
 *    Thus, `minimist-shell` is designed to be POSIX-sh-first (see more on this under the `"posix":
 *    false` option below).
 *
 *  - That said ... although I've successfully (for the most part) avoided shell arrays, integer
 *    support, so-on and so-forth in *many* of my scripts to date ... argument-parsing is
 *    *precisely* the sort of thing for which these features shine.
 *
 *    So, though secondary to the goal of pure POSIX-compliance by default, `minimist-shell`
 *    *attempts* to support more modern shell-features, when relevant to the goal of referring to
 *    command-line arguments. If your scripts are primarily going to be run interactively by
 *    developers, working in modern shells, you can tweak `minimist-shell` to enable *much* more
 *    intuitive interaction with certain forms of arguments. (See the `"arrays"`,
 *    `"associative_arrays"`, and `"typesets"` options, below.)
 *
 *  - It's very easy to come up with things you *can* do in JavaScript, and *cannot* do in shell-
 *    script — or at least, things that are *devilishly hard* to do in shell-script. Pursuant to
 *    that, I'd much rather `minimist-shell` handle the general or common cases well, and completely
 *    ignore the perverse ones.
 *
 *    At the most basic, this means arguments with characters other than the standard shell-variable
 *    naming set (`[a-zA-Z_][0-9a-zA-Z_]*`) will be completly ignored. No attempt will be made to
 *    turn, for instance, `--passé` will not be exposed under any shell-variable whatsoever.
 *
 *    Sorry, speakers of all those beautiful foreign languages — blame the shell, not me. `)=`
 *
 *    (The only exception here, is argument *content* w.r.t. shell-quoting: writing here, in this
 *     documentation, instructions to avoid trying to use arbitrarily-perverse command-line
 *     argument-names is useful, as the author of the script has some measure of control over that;
 *     but the *data* passed to their script — well, that's not necessarily the case, anymore. I
 *     intend to go to some lengths to ensure fairly-perverse argument-content is preserved, as
 *     passed, in the shell-variable.)
 *
 *  - Finally, `minimist-shell` tries very hard not to step on *declared* arguments in order to
 *    implement any of the convenience features mentioned herein.
 *
 *    Several of my features generate shell-variables of names slightly differing from the arguments
 *    passed by the user (for instance, a suffixed `$foo1` variable to refer to the first element of
 *    an array-argument; or `$FOO` as an alias to `$foo` when the `"uppercase"` option is enabled.)
 *    However, as it's remotely possible that you could meaningfully use arguments named `--foo1` or
 *    `--FOO` in addition to `--foo`, `minimist-shell` will *never* generate such aliases or
 *    conveniences if it can ascertain that the name in question is in any way in-use — *even if it
 *    isn't present in a given command-line.* This is intended to provide deterministic behaviour of
 *    a given script's argument-parser, regardless of the particular set of passed arguments.
 *
 *        printf "'%s' " $# "$@"                          //=> '1' '--foo=123'
 *        eval "$(minimist $* <<<'{"uppercase":true}')"
 *        print "$FOO"                                    //=> '123'
 *        eval "$(minimist $* <<<'{"uppercase":true, "boolean":"FOO"}')"
 *        print "$FOO"                                    //=> ''
 *        print "$foo"                                    //=> '123'
 *
 *    (This usually involves checking the various `minimist` / `rminimist` declaration-arrays — i.e.
 *     if you declare `{ f: 'FOO' }` in `opts.alias`, `minimist-shell` will never stomp on `$FOO`,
 *     even if it's not passed by the user as a flag. This protective behaviour can be explicitly
 *     triggered for untyped arguments by adding them to an array at `opts.untyped`.)
 *
 * ### Usage
 *
 * FIXME
 *
 * ### Options
 * In addition<strong name="a1">[¹](#fn1)</strong> to the existing properties of the `opts` object
 * passed to `minimist()`, several `minimist_shell()`-specific options may be included:
 *
 *  - `"positionals":` [**Default:** `"none"`]
 *    The equivalent of `minimist`'s `argv._`, in a shell-script, are the [“positional
 *    parameters”][2]: `$1 ... $9`, `${10} ... ${N}`, and so on. I provide three ways to handle
 *    these:
 *
 *    1. **`"none"`:** By default, `minimist_shell()` returns a script that only manipulates
 *       *variables* (that is ... scalar shell parameters whose names begin with `[a-zA-Z_-]`.)
 *       Positional parameters aren't re-exposed to the invoking shell-script in any way; although
 *       they are still available (in their original positions) in the shell's positional array:
 *
 *           printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
 *           eval "$(minimist $* <<<'{"positionals":"none"}')"
 *           print "$path"                                //=> '/whee'
 *           printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
 *
 *    2. **`"set"`:** If instructed to, `minimist_shell()` will generate a command using the [POSIX
 *       `set -- ...` form][set]<strong name="a2">[²](#fn2)</strong> that resets the `$1 ...`
 *       positional-parameters to the positionals that `minimist()` stores in `argv._`.
 *       Additionally, the *original* positional params are exposed in equivalently-named, prefixed
 *       variables, like `$__1`, `$__2`, and so on. Example:
 *
 *           printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
 *           eval "$(minimist $* <<<'{"positionals":"set"}')"
 *           print "$path"                                //=> '/whee'
 *           printf "'%s' " "$__1" "$__2" "$__3" "$__4"   //=> 'foo' '--path' '/whee' 'bar'
 *           printf "'%s' " $# "$@"                       //=> '2' 'foo' 'bar'
 *
 *    3. **`"prefix"`:** Effectively the inverse of `"set"`, this will set the prefixed-positional
 *       variables *instead* of using the `set` builtin, leaving the actual positional parameters
 *       unmodified:
 *
 *           printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
 *           eval "$(minimist $* <<<'{"positionals":"prefix"}')"
 *           print "$path"                                //=> '/whee'
 *           printf "'%s' " "$__1" "$__2" "$__3" "$__4"   //=> 'foo' 'bar' '' ''
 *           printf "'%s' " $# "$@"                       //=> '4' 'foo' '--path' '/whee' 'bar'
 *
 *  - `"booleans":` [**Default:** `""` — the empty string]
 *    There's [a handful of popular ways][3] to represent booleans, `true` and `false`, in shell-
 *    scripts; unfortunately, it's a common enough problem — and one with enough popular solutions —
 *    that I don't feel compfortable dictating a convention here, over configuration. Thus, there's
 *    three settings for this option:
 *
 *    1. **The empty string, `""`.** The most common method (and the most robust), is to use string-
 *       length as a proxy for truthiness. In this system, the `[`/`test` builtin's `-z` (‘zero-
 *       length’) or `-n` (‘nonempty’) flags are used to determine truthiness in a boolean context,
 *       variables are left empty or null (undifferentiatedly) to indicate falseyness, and setting a
 *       variable to any arbitrary value indicates truthiness. `minimist_shell()` supports this by
 *       leaving `undefined` JavaScript values undefined in the shell output (thus, nullary) and
 *       setting `false` values to the empty string (`""`) (both of which `[ -n "$var" ]` will
 *       consider falsey); while setting `true` values to the string `"true"` (which `[ -n "$var" ]`
 *       will consider truthy.)
 *
 *           printf "'%s' " $# "$@"                       //=> '2' '--foo' '--no-bar'
 *           eval "$(minimist $* <<<'{"booleans":""}')"
 *           printf "'%s' " "$foo" "$bar"                 //=> 'true' ''
 *           if [ -n "$foo" ] && [ -z "$bar" ]; then
 *              echo 'whee'; fi                           //=> whee
 *
 *       (This is the most common method for a reason; and it is the one I, personally, as a
 *        relatively experienced shell-script author, would recommend.)
 *
 *    2. **The string `"function"`.** The `if` construct in POSIX shell invokes the following
 *       function or command, and then tests the *exit code* thereof. The `[` (`test`) builtin is
 *       one common use of this functionality; but another are the builtin `true` and `false`
 *       *functions*, which simply immediately exit, providing a correspondingly-boolean exit-code.
 *       Such functions can be directly passed to `if` as commands (i.e. `if A_BOOLEAN; then ...` —
 *       note the lack of a `$`!); and `minimist_shell()` can generate shell-functions that behave
 *       this way for boolean flags:
 *
 *           printf "'%s' " $# "$@"                       //=> '2' '--foo' '--no-bar'
 *           eval "$(minimist $* <<<'{"booleans":"function"}')"
 *           type foo bar                                 //=> foo is a shell function, bar is a ...
 *           if foo && ! bar; then
 *              echo 'whee'; fi                           //=> whee
 *
 *       Although there are some security concerns with using this in shell-variables to represent
 *       boolean values more directly, it *is* convenient and somewhat more concise.
 *
 *    3. **An array of precisely two strings, (i.e. `["yes", "no"]`).** Finally, sometimes, the most
 *       direct method, is comparing string-content equality in the shell. If given a tuple of
 *       string-words to represent `true` and `false`, `minimist_shell()` will simply set boolean-
 *       flag's variables directly to those provided values:
 *
 *           printf "'%s' " $# "$@"                       //=> '2' '--foo' '--no-bar'
 *           eval "$(minimist $* <<<'{"booleans":["yes","no"]}')"
 *           printf "'%s' " "$foo" "$bar"                 //=> 'yes' 'no'
 *           if [ "$foo" = "yes" ] && [ "$bar" = "no" ]; then
 *              echo 'whee'; fi                           //=> whee
 *
 *       (Of note, this is the only way out of the above for which it's easy to differentiate
 *        “absent” arguments, from “explicitly boolean-false” arguments.)
 *
 *  - `"arrays":` [**Default:** `false`]
 *    By default, array-arguments (`--foo=A --foo=B` under @substack's `minimist`, or `rminimist`'s
 *    `"array"` configuration property) are exposed via index-suffixed scalar shell-variables:
 *
 *        printf "'%s' " $# "$@"                          //=> '2' '--foo=123' '--foo=456'
 *        eval "$(minimist $* <<<'{"arrays":false}')"
 *        printf "'%s' " "$foo" "$foo0" "$foo1"           //=> '123' '123' '456'
 *
 *    However, many modern shells support ‘array-type’ variables. By setting this configuration-
 *    option to `true`, you can instruct `minimist_shell()` to generate non-POSIX `typeset`
 *    declarations, creating shell-arrays to match `minimist()`-generated JavaScript arrays:
 *
 *        printf "'%s' " $# "$@"                          //=> '2' '--foo=123' '--foo=456'
 *        eval "$(minimist $* <<<'{"arrays":true}')"
 *        typeset -p foo | head -n1                       //=> typeset -a foo # i.e. ‘foo is an array’
 *        printf "'%s' " "${#foo[@]}" "${foo[@]}"         //=> '2' '123' '456'
 *
 *    (Of note, this is the only way to *iterate* list-style arguments; `minimist_shell()` makes no
 *     attempt at a scalar-variable proxy to array-length constructs like `${#foo[@]}`.)
 *
 *  - `"associative_arrays":` [**Default:** `false`]
 *    Equivalent to `"arrays"`, but for very-modern<strong name="a3">[³](#fn3)</strong> associative-
 *    array support. When disabled, `minimist_shell()` attempts to flatten `minimist()`'s “object”-
 *    arguments to scalar variables, concatenating the object-path with double-underscores:
 *
 *        printf "'%s' " $# "$@"                          //=> '2' '--ab.cd=123' '--ab.xy=456'
 *        eval "$(minimist $* <<<'{"associative_arrays":false}')"
 *        printf "'%s' " "$ab__cd" "$ab__xy"              //=> '123' '456'
 *
 *    If enabled, though, `minimist_shell()` makes an attempt to map simple JavaScript objects to
 *    associative-array constructs:
 *
 *        printf "'%s' " $# "$@"                          //=> '2' '--ab.cd=123' '--ab.xy=456'
 *        eval "$(minimist $* <<<'{"arrays":true}')"
 *        typeset -p ab | head -n1                        //=> typeset -A ab # i.e. ‘ab is a map’
 *        printf "'%s' " "${#ab[@]}" "$ab[cd]" "$ab[xy]"  //=> '2' '123' '456'
 *
 *    It should be fairly obvious that both of these are fragile processes; keep your object-style
 *    arguments relatively simple. (This should go without saying *anyway*, honestly; and given that
 *    this is probably `minimist`'s least-used feature, I'm not going to spend too much love on
 *    perfecting the shell-script translation.)
 *
 *  - `"typesets":` [**Default:** `false`]
 *    FIXME
 *
 *  - `"uppercase":` [**Default:** `false`]
 *    Causes `$lowercase` variables to be duplicated in `$UPPERCASED` form as well.
 *
 *    This option is provided because some shell-scripters prefer to write their scripts with all-
 *    uppercase variable naming; but it's off-by-default, as this is [considered ill-advised][4].
 *
 *  - `"POSIX":` [**Default:** `true`]
 *    Although most modern shells are *derived* from the Bourne shell, they have come quite a long
 *    way in the intervening years. There's quite a few advanced features supported by recent
 *    versions of both the Z Shell and Bash; but using them can break scripts if they are executed
 *    on ancient (`sh`) or minimal (`dash`) interpreters.
 *
 *    Writing Bash-style or sh-style scripts is largely a matter of taste. By default,
 *    `minimist-shell` generates widely-compatible shell-script (“POSIX sh”) wherever possible; but
 *    it can explicitly be instructed to take advantage of modern shell features where possible by
 *    passing `"POSIX": false`.
 *
 *    Of note, several `minimist-shell` features are *explicitly for* such modern features; enabling
 *    any one of those implicitly enables `"posix": false` (and is incompatible with an explicitly-
 *    passed `"POSIX": true`.) The features that break POSIX compatibility are:
 *
 *     - `"array": true`
 *     - `"associative_array": true`
 *     - `"typeset": true`
 *
 * --- --- ---
 *
 * 1. <strong name="fn1">Nota bene:</strong>
 *    The original `opts` passed to `minimist()` *must* all be included; 's how `minimist_shell()`
 *    determines which arguments have been “declared”, and thus avoids stomping on them. <sub>[↩︎](#a1)</sub>
 *
 * 2. FIXME
 *
 * 3. <strong name="fn3">Very modern.</strong>
 *    Zsh has supported associative arrays for a while, but Bash only shipped support in v4.0 —
 *    which is still fairly rare in production. (For instance, as of this writing in mid-2017, macOS
 *    is still shipping with Bash **3.2**.) <sub>[↩︎](#a3)</sub>
 *
 *    [1]: <http://mywiki.wooledge.org/BashWeaknesses> "Greg's Wiki — BashWeaknesses"
 *    [2]: <http://wiki.bash-hackers.org/scripting/posparams>
 *       "Bash Hackers Wiki — Handling positional parameters"
 *    [3]: <https://unix.stackexchange.com/a/185680/12095>
 *       "What is a best practice to represent a boolean value in a shell script?"
 *    [4]: <https://unix.stackexchange.com/a/223599/12095>
 *       "Are there naming conventions for variables in shell scripts?"
 *
 *    [set]: <http://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#set>
 *       "The Open Group Base Specifications / IEEE Std 1003.1-2008 — The `set` builtin"
 */
function minimist_shell(argv, opts){
   const shOpts = validate_opts(opts)

   // NYI ...
}

/**
 * A helper to validate the options passed into `minimist_shell()`. Returns a cloned-and-cleaned
 * `opts` object; and throws `ArgumentErrors` on egregious unsupported settings.
 */
function validate_opts(minimist){
   let positionals, booleans, arrays, associative_arrays, typesets, uppercase, POSIX, untyped

   if (typeof minimist !== 'object')
      throw new ArgumentError(
               "minimist_shell() requires the original `opts`-objet passed to `minimist()`!")

   const opts = Object.assign(new Object, minimist.shell)

   // First, aliases: this is determining *what* the user asked for.
   ['positionals', 'booleans', 'arrays', 'associative_arrays', 'typesets', 'uppercase', 'untyped']
      .forEach(opt =>
         if (typeof opts[opt] === 'undefined')
                    opts[opt] = minimist[opt] )

   if (typeof opts.POSIX === 'undefined') opts.POSIX = opts.posix
   if (typeof opts.POSIX === 'undefined') opts.POSIX = minimist.POSIX
   if (typeof opts.POSIX === 'undefined') opts.POSIX = minimist.posix

   // Now, validation: ensuring ‘what the user asked for’ is a thing we can do (and handling of
   // default values, while we're at it.)
   positionals = (typeof  opts.positionals === 'undefined')
               ? 'none' : opts.positionals

   if (! _(['none', 'set', 'prefix']).includes(positionals) )
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "positionals" option.'
       , 'minimist_shell(..., {"positionals":...}) must be set to one of these strings:'
       , '   "none", "set", or "prefix".')

   booleans = (typeof opts.booleans === 'undefined')
            ? ""    : opts.booleans

   if (! _.isArray(booleans) && booleans !== "" && booleans !== 'function')
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "booleans" option.'
       , 'minimist_shell(..., {"booleans":...}) must be set to one of:'
       , ' - The empty string (""),'
       , ' - The precise string "function",'
       , ' - or an array of two strings: ["yes", "no"].')

   arrays = (typeof opts.arrays === 'undefined')
          ? false : opts.arrays

   if (typeof arrays !== 'boolean')
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "arrays" option.'
       , 'minimist_shell(..., {"arrays":...}) must be set to either `true` or `false`.')

   associative_arrays = (typeof opts.associative_arrays === 'undefined')
                      ? false : opts.associative_arrays

   if (typeof associative_arrays !== 'boolean')
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "associative_arrays" option.'
       , 'minimist_shell(..., {"associative_arrays":...}) must be set to either `true` or `false`.')

   typesets = (typeof opts.typesets === 'undefined')
            ? false : opts.typesets

   if (typeof typesets !== 'boolean')
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "typesets" option.'
       , 'minimist_shell(..., {"typesets":...}) must be set to either `true` or `false`.')

   uppercase = (typeof opts.uppercase === 'undefined')
             ? false : opts.uppercase

   if (typeof uppercase !== 'boolean')
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "uppercase" option.'
       , 'minimist_shell(..., {"uppercase":...}) must be set to either `true` or `false`.')

   untyped = (typeof     opts.untyped === 'undefined')
           ? new Array : opts.untyped

   if (! _.isArray(untyped))
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "untyped" option.'
       , 'minimist_shell(..., {"untyped":...}) must be an array of string-ish flag names.')

   POSIX = (typeof opts.POSIX === 'undefined')
         ? true  : opts.POSIX

   if (typeof POSIX !== 'boolean')
      throw multiline_error(new ArgumentError
       , 'minimist_shell(): Invalid setting for "POSIX" option.'
       , 'minimist_shell(..., {"POSIX":...}) must be set to either `true` or `false`.')

   // Next, we validate *combinations* of options (i.e. POSIX-compatibility):
   ['arrays', 'associative_arrays', 'typesets'].forEach(opt => {
      if (opts.POSIX && opts[opt]) // If the user *explicitly* requested POSIX-sh, explode.
         throw multiline_error(new ArgumentError
          , 'minimist_shell(): "POSIX" setting cannot be satisfied!'
          , 'minimist_shell(..., {"POSIX": true}) is incompatible with "'+opt+'".'
          , '   Either disable "'+opt+'", or remove the explicit "POSIX" setting.')

      POSIX = false
   })

   // Finally, apply our computed values, and return them.
   opts.positionals        = positionals
   opts.booleans           = booleans
   opts.arrays             = array
   opts.associative_arrays = associative_arrays
   opts.typesets           = typesets
   opts.uppercase          = uppercase
   opts.untyped            = untyped
   opts.POSIX              = POSIX

   // Finally, let's validate the `minimist()` arguments — and reject styles not included in the
   // subset of `minimist` functionality we support. (For `minimist`-supported functionality, we
   // defer to `minimist` itself — I'm not going to re-validate options that my documentation
   // instructs the user to pass to `minimist()` first!)
   if (typeof minimist.boolean !== 'undefined' && ! _.isArray(minimist.boolean))
      throw multiline_error(new ArgumentError
       , "minimist_shell(): minimist()'s `\"boolean\": <string | bool>` is not supported"
       , 'minimist_shell(..., {"boolean":...}) must be an *array* of string-ish flag names.')

   if (typeof minimist.string !== 'undefined' && ! _.isArray(minimist.string))
      throw multiline_error(new ArgumentError
       , "minimist_shell(): minimist()'s `\"string\": <string>` is not supported"
       , 'minimist_shell(..., {"string":...}) must be an *array* of string-ish flag names.')

   return opts
}

/**
 * A helper to reduce a `minimist()`-produced `argv` to a flattened key-value map of shell-variables
 * that should be returned by `minimist_shell()`.
 *
 * Expects the `opts` passed to your `minimist()` implementation, augmented as described in the
 * documentation for `minimist_shell()`. Optionally takes a pre-validated `opts.shell`-object.
 *---
 * FIXME: `shellify_name` isn't officially exposed yet, use at your own risk
 */
function flatten_args(argv, opts, shOpts, shellify_name){ let known
   if (typeof shOpts === 'undefined')
              shOpts = validate_opts(opts)

   if (typeof shellify_name !== 'function')
              shellify_name = default_shellifier

   // Before we start, to protect the user's intentions, we need a complete understanding of all
   // flag-names that appear in *any* configuration option — i.e. the ‘known flags.’

   // minimist-shell: `opts.shell.untyped` (exists exclusively to extend `known`)
   known = [].concat(shOpts.untyped)

   // minimist: `opts.boolean`
   known = known.concat(opts.boolean)

   // minimist: `opts.string`
   known = known.concat(opts.string)

   // rminimist: `opts.number`
   known = known.concat(opts.number)

   // rminimist: `opts.array`
   known = known.concat(opts.array)

   known = _.compact(known)

   // minimist: `opts.default`
   if (typeof opts.default !== 'undefined' && _.isObject(opts.default))
      Object.getOwnPropertyNames(opts.default)

   // minimist: `opts.alias`
   if (typeof opts.alias !== 'undefined' && _.isObject(opts.alias)) {
      Object.getOwnPropertyNames(opts.alias).forEach(key => {
         known.push(key)
         known.push(opts.alias[key])
      }) }


   // And now, we begin to process the flags!
   const  flags = Object.assign(new Object, argv)
   delete flags['_']
   delete flags['--']

   // First, we need to process any flags that aren't shell-compatible (attempting to replace them
   // with mutated names via the passed `shellify_name()`.)
   //
   // (They won't actually be removed from `flags` until the catch-all clean-up below.)
   _(flags).entries()
      .filter( ([flag, value])               => ! valid_shell_variable.test(flag)   )
      .map(    ([flag, value])               => [flag, shellify_name(flag), value]  )
      .filter( ([flag, shellified, value])   => Boolean(shellified)                 )
      .filter( ([flag, shellified, value])   => ! _.contains(known, shellified)     )
   .commit()
      .forEach(([flag, shellified, value])   => {
         flags[shellified] = flags[flag]
         delete flags[flag] })
   .commit()

   // Now, we're going to flatten arrays and maps, if necessary
   if (! shOpts.arrays) _(flags).entries()
      .filter( ([flag, arr]) => _.isArray(arr) ).commit()
      .forEach(([flag, arr]) => {

         _.forEach(arr, (e, idx) => {
            const shellified  = module.exports.munger(flag, idx) // i.e. flag__N
            flags[shellified] = arr[idx] })

         delete flags[flag]

      }).commit()

   if (! shOpts.associative_arrays) // NYI ...

   // Finally, let's clean out any cruft.
   //---
   // FIXME: Lodash needs to expand `_.remove()` to all Collections (i.e. Objects)
   _.forEach(flags, (value, flag) => {
      if (! valid_shell_variable.test(flag))
         delete flags[flag] })
}

/**
 * A helper to preform simple manipulations to reduce a property-name to a valid shell-variable-
 * name. Takes a string, returns the same string if it's already shell-compatible, and returns
 * falsey if the string can't be shell-ified.
 *---
 * This can currently be overridden by the fourth argument to `flatten_args`, although this is
 * undocumented behaviour right now.
 */
function default_shellifier(name){
   if (valid_shell_variable.test(name))
      return name

   if (/-/.test(name)) {
      name.replace(/-/, '_')

      if (valid_shell_variable.test(name))
         return name
   }

   return undefined
}

function default_munger(names...){
  return names.join('__')
}


function multiline_error(error, message, lines...){
   error.message = message
   error.lines = lines
}

module.exports                = minimist_shell
module.exports.flatten_args   = flatten_args
module.exports.shellifier     = default_shellifier
module.exports.munger         = default_munger
