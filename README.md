# require-hacker

[![npm version](https://img.shields.io/npm/v/require-hacker.svg?style=flat-square)](https://www.npmjs.com/package/require-hacker)
[![npm downloads](https://img.shields.io/npm/dm/require-hacker.svg?style=flat-square)](https://www.npmjs.com/package/require-hacker)
[![build status](https://img.shields.io/travis/catamphetamine/require-hacker/master.svg?style=flat-square)](https://travis-ci.org/catamphetamine/require-hacker)
[![coverage](https://img.shields.io/coveralls/catamphetamine/require-hacker/master.svg?style=flat-square)](https://coveralls.io/r/catamphetamine/require-hacker?branch=master)

Is a small helper module providing tools for instrumenting Node.js `require()` calls.

## Topics

- [What it does and why is it needed?](#what-it-does-and-why-is-it-needed)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [API](#api)
- [Gotchas](#gotchas)
- [References](#references)
- [Contributing](#contributing)

## What it does and why is it needed?

Standard Node.js `require()` calls simply loaded javascript files from disk and evaluated them.

Some time after various hackers hacked the [Module module](https://github.com/nodejs/node/blob/master/lib/module.js) and various solutions emerged such as `coffee-script/register` and `babel-core/register` allowing everyone to `require()` code written in any language out there (coffeescript and ES7 in case of the aforementioned "require hooks").

This module provides a tool to perform such tricks along with a possibility to also intercept `require()` calls not just for specific file extensions but for an arbitrary abstract path. Consider, for example, `require("http://thor.onion/module?user=123")` or `require("春秋左傳·僖公二十二年")`, whatever. Who might need this? You never know.

## Installation

```bash
$ npm install require-hacker --save
```

## Usage

Something basic

```javascript
import require_hacker from 'require-hacker'
import fs from 'fs'

// mount require() hook
const hook = require_hacker.hook('txt', path =>
{
  return `module.exports = "${fs.readFileSync(path).replace(/"/g, '\"')}"`
})

// will output text file contents
console.log(require('./test.txt'))

// unmount require() hook
hook.unmount()

// will throw "SyntaxError: Unexpected token ILLEGAL"
require('./test without hook.txt')
```

Something unusual

```javascript
const hook = require_hacker.global_hook('network', path =>
{
  if (!path.starts_with('http://xhamster.com'))
  {
    return
  }

  // returns javascript module source code, something like:
  //
  // "module.exports =
  //  {
  //    category   : 'redhead',
  //    videos     : [12345, 12346, 12347],
  //    unsubscribe: function()
  //    {
  //      http.post('http://xhamster.com/unsubscribe', { user: 123 })
  //    }
  //  }"
  //
  const source = synchronous_http.get(path)
  return { source, path }
})

const readheads = require('http://xhamster.com/category/redhead')
readheads.unsubscribe()
```

Or

```javascript
const hook = require_hacker.global_hook('database', path =>
{
  if (!path.starts_with('postgresql://'))
  {
    return
  }

  // returns javascript module source code, something like:
  //
  // "module.exports =
  //  {
  //    words: ['a', 'b', 'c']
  //    sum: function()
  //    {
  //      return words.join('')
  //    }
  //  }"
  //
  const schema = path.substring(0, 'postgresql://'.length)
  const source pg.sql(`select * from ${schema}.generate_javascript()`)
  return { source, path }
})

const summator = require('postgresql://summator')
console.log(summator.sum())
```

And don't ask me what for.

## Configuration

To see debug logs in the console one can use this code

```javascript
require_hacker.log.options.debug = true
```

## API

#### .hook(file_extension, resolve)

Will intercept all `require()` calls for paths with this `file_extension` and reroute them to the `resolve` function. The `require()`d path must exist in the filesystem, otherwise an exception will be thrown: `Cannot find module`.

Returns an object with `.unmount()` method which unmounts this `require()` hook from the system.

The `resolve` function takes two parameters:

  * the `path` which is `require()`d
  * the `module` in which the `require()` call was originated (this `module` parameter can be used for `require_hacker.resolve(path, module)` function call)

The `resolve` function must return either a valid CommonJS javascript module source code (i.e. "module.exports = ...", etc) or it can simply `return` nothing and in that case it will skip this hook.

#### .global_hook(meaningful_id, resolve, [options])

Can intercept all `require()` calls. The behaviour is controlled by `precede_node_loader` option:

  * when it's `true` (default) it will intercept all `require()` calls before they are passed to the original Node.js `require()` loader
  * when it's `false` it will intercept only those `require()` calls which failed to be resolved by the original Node.js `require()` loader

Returns an object with `.unmount()` method which unmounts this `require()` hook from the system.

The `resolve` function takes two parameters:

  * the `path` which is `require()`d (e.g. a relative one)
  * the `module` in which the `require()` call was originated (this `module` parameter can be used for `require_hacker.resolve(path, module)` function call)

The `resolve` function must return either `undefined` (in which case it will skip this hook and proceed as normal) or an object `{ source, path }` where

  * `source` is a valid CommonJS javascript module source code (i.e. "module.exports = ...", etc)
  * `path` is the absolute path of the `path` argument passed to this `require()` function (which could be relative). This returned `path` is only gonna matter if `require()`ing some other relative path from the `source` being returned (because it would get resolved against this absolute `path`).

#### .resolver(resolve)

Can intercept all `require(path)` calls and tamper with the `path` modifying it if needed (this process is called "resolving").

Returns an object with `.unmount()` method which unmounts this interceptor.

The `resolve` function takes two parameters:

  * the `path` which is `require()`d.
  * the `module` in which the `require()` call was originated (this `module` parameter can be used for `require_hacker.resolve(path, module)` function call)

The `resolve` function must either return a real filesystem path to a javascript (or json) file or it can simply `return` nothing and in that case it will take no effect.

#### .to_javascript_module_source(anything)

Converts anyting (an undefined, a string, a JSON object, a function, a regular expression - anything) to a valid CommonJS javascript module source code.

#### .resolve(path, module)

Resolves a requireable `path` to a real filesystem path to a javascript (or json) file. Resolution is performed relative to the `module` (javascript file) passed as the second parameter (resolves `npm link`, global `node_modules`, etc). It's just an alias to the native Node.js path resolution function. Will throw `Error: Cannot find module '...'` if the `path` isn't resolved to an existing javascript (or json) file.

## Gotchas

None whatsoever

## References

There are various articles on this sort of `require()` hook trickery on the internets.

[How require() actually works](http://thenodeway.io/posts/how-require-actually-works/)

[Hooking into Node loader for fun and profit](http://glebbahmutov.com/blog/hooking-into-node-loader-for-fun-and-profit/)

## Contributing

After cloning this repo, ensure dependencies are installed by running:

```sh
npm install
```

This module is written in ES6 and uses [Babel](http://babeljs.io/) for ES5
transpilation. Widely consumable JavaScript can be produced by running:

```sh
npm run build
```

Once `npm run build` has run, you may `import` or `require()` directly from
node.

After developing, the full test suite can be evaluated by running:

```sh
npm test
```

When you're ready to test your new functionality on a real project, you can run

```sh
npm pack
```

It will `build`, `test` and then create a `.tgz` archive which you can then install in your project folder

```sh
npm install [module name with version].tar.gz
```

## License

[MIT](LICENSE)