# require-hacker

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

<!---
[![Gratipay][gratipay-image]][gratipay-url]
-->

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
import Require_hacker from 'require-hacker'
import fs from 'fs'

const require_hacker = new Require_hacker({ debug: false })

// mount require() hook
const hook = require_hacker.hook('txt', (path, fallback) =>
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
const hook = require_hacker.resolver('network', path =>
{
  if (path.starts_with('http://xhamster.com'))
  {
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
    return synchronous_http.get(path)
  }
})

const readheads = require('http://xhamster.com/category/redhead')
readheads.unsubscribe()
```

Or

```javascript
const hook = require_hacker.resolver('database', path =>
{
  if (path.starts_with('postgresql://'))
  {
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
    return pg.sql(`select * from ${schema}.generate_javascript()`)
  }
})

const summator = require('postgresql://summator')
console.log(summator.sum())
```

And don't ask me what for.

## Configuration

Available configuration parameters:

```javascript
{
  // debug mode.
  // when set to true, lets you see debugging messages in the console.
  debug: true // is false by default
}
```

## API

#### Constructor

Takes an object with options (see [Configuration](#configuration) section above)

#### .hook(file_extension, handler)

Will intercept all `require()` calls for paths with this `file_extension`. Handler takes two parameters: the `path` which is `require()`d and the `fallback` function which falls back to normal `require()` behaviour for this `require()` call. Returns an object with `.unmount()` method which unmounts this `require()` hook from the system.

#### .resolver(meaningful_id, resolver)

Will intercept all `require()` calls which failed to be resolved by original Node.js `require()` loader. The `resolver` function takes two parameters: the `path` which is `require()`d and the `flush_cache` helper which flushes Node.js `require()` cache for this `path` (all modules `require()`d are by default evaluated only one time and then are cached for the entire process lifetime so that all subsequent `require()` calls for this path will just return the already compiled and cached module). Returns an object with `.unmount()` method which unmounts this `require()` hook from the system.

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

While actively developing, one can use

```sh
npm run watch
```

in a terminal. This will watch the file system and run tests automatically 
whenever you save a js file.

## License

[MIT](LICENSE)
[npm-image]: https://img.shields.io/npm/v/require-hacker.svg
[npm-url]: https://npmjs.org/package/require-hacker
[travis-image]: https://img.shields.io/travis/halt-hammerzeit/require-hacker/master.svg
[travis-url]: https://travis-ci.org/halt-hammerzeit/require-hacker
[downloads-image]: https://img.shields.io/npm/dm/require-hacker.svg
[downloads-url]: https://npmjs.org/package/require-hacker
[coveralls-image]: https://img.shields.io/coveralls/halt-hammerzeit/require-hacker/master.svg
[coveralls-url]: https://coveralls.io/r/halt-hammerzeit/require-hacker?branch=master

<!---
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg
[gratipay-url]: https://gratipay.com/dougwilson/
-->