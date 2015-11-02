import path from 'path'
import chai from 'chai'

import fs from 'fs'

import Require_hacker from '../source/index'

import Log from '../source/tools/log'

chai.should()

// logging
const log = new Log('testing', { debug: true })

describe('require hacker', function()
{
	beforeEach(function()
	{
	})

	after(function()
	{
	})

	it('should hook into file extension loading', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = require_hacker.hook('txt', (path, fallback) =>
		{
			return `module.exports = "${fs.readFileSync(path).toString()}"`
		})

		// will output text file contents
		require('./test.txt').should.equal('Hot threesome interracial with double penetration')

		// unmount require() hook
		hook.unmount()

		// will throw "SyntaxError: Unexpected token ILLEGAL"
		const would_fail = () => require('./another test.txt')
		would_fail.should.throw(SyntaxError)
	})

	it('should hook into arbitrary path loading', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = require_hacker.resolver('textual', (path, flush_cache) =>
		{
			// maybe also test flush_cache() some time

			if (path.indexOf('http://xhamster.com') >= 0)
			{
				return `module.exports = "Free porn"`
			}
		})

		// will output text file contents
		require('http://xhamster.com').should.equal('Free porn')

		// unmount require() hook
		hook.unmount()

		// will throw "Error: Cannot find module"
		const would_fail = () => require('http://xhamster.com')
		would_fail.should.throw('Cannot find module')
	})
})