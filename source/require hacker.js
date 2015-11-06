// Hacking too much time

// Based on Node.js Module class sources:
// https://github.com/nodejs/node/blob/master/lib/module.js

import fs     from 'fs'
import path   from 'path'
import Module from 'module'

import Log from './tools/log'
import { exists, ends_with } from './helpers'

import serialize from './tools/serialize-javascript'

const original_findPath = Module._findPath

export default class Require_hacker
{
	preceding_abstract_path_resolvers = []
	abstract_path_resolvers = []
	
	// original_loaders = {}

	abstract_path_resolved_modules = {}

	constructor(options)
	{
		// // take the passed in options
		// this.options = clone(options)

		// logging
		this.log = new Log('require-hook', { debug: options.debug }) // this.options.debug

		// instrument Module._findPath
		// https://github.com/nodejs/node/blob/master/lib/module.js#L335-L341
		Module._findPath = (...parameters) =>
		{
			const request = parameters[0]
			// const paths = parameters[1]

			// preceeding resolvers
			for (let resolver of this.preceding_abstract_path_resolvers)
			{
				const resolved = resolver.resolve(request)
				if (typeof resolved !== 'undefined')
				{
					return resolved
				}
			}

			// original Node.js loader
			const filename = original_findPath.apply(undefined, parameters)
			if (filename !== false)
			{
				return filename
			}

			// rest resolvers
			for (let resolver of this.abstract_path_resolvers)
			{
				const resolved = resolver.resolve(request)
				if (typeof resolved !== 'undefined')
				{
					return resolved
				}
			}

			return false
		}
	}

	// installs a require() hook for paths 
	// which don't exist in the filesystem
	//
	// (if these paths exist in the filesystem
	//  then use the .hook(extension, resolve) method instead)
	//
	// id - a meaningful textual identifier
	//
	// resolver - a function which takes two parameters:
	//
	//              the path to be resolved
	//
	//              a function which flushes require() cache for this path
	//              with no parameters
	//
	//            must return a javascript CommonJS module source code
	//            (i.e. "module.exports = ...", etc)
	//
	// returns an object with an .undo() method
	//
	global_hook(id, resolver, options = {})
	{
		validate.global_hook(id, resolver)

		const resolver_entry = 
		{
			id,
			resolve: path =>
			{
				const resolved_path = `${path}.${id}`
				
				// CommonJS module source code
				const source = resolver(path)
				
				if (!exists(source))
				{
					return
				}
				
				// const flush_cache = () => delete require.cache[resolved_path]
				delete require.cache[resolved_path]

				this.abstract_path_resolved_modules[resolved_path] = source

				return resolved_path
			}
		}

		if (options.precede_node_loader)
		{
			this.preceding_abstract_path_resolvers.push(resolver_entry)
		}
		else
		{
			this.abstract_path_resolvers.push(resolver_entry)
		}

		const hook = this.hook(id, path => 
		{
			const source = this.abstract_path_resolved_modules[path]
			delete this.abstract_path_resolved_modules[path]
			return source
		})

		const result =
		{
			unmount: () =>
			{
				// javascript arrays still have no .remove() method in the XXI-st century
				this.preceding_abstract_path_resolvers = this.preceding_abstract_path_resolvers.filter(x => x !== resolver_entry)
				this.abstract_path_resolvers = this.abstract_path_resolvers.filter(x => x !== resolver_entry)
				hook.unmount()
			}
		}

		return result
	}

	// installs a require() hook for the extension
	//
	// extension - a file extension to hook into require()s of
	//             (examples: 'css', 'jpg', 'js')
	//
	// resolve   - a function that takes two parameters: 
	//
	//               the path requested in the require() call 
	//
	//               and a fallback function (fall back to default behaviour)
	//               with no parameters
	//
	//             must return a javascript CommonJS module source code
	//             (i.e. "module.exports = ...", etc)
	//
	hook(extension, resolve)
	{
		this.log.debug(`Hooking into *.${extension} files loading`)
		
		// validation
		validate.extension(extension)
		validate.resolve(resolve)

		// dotted extension
		const dot_extension = `.${extension}`

		// keep original extension loader
		const original_loader = Module._extensions[dot_extension]

		// display a warning in case of extension loader override
		if (original_loader)
		{
			// output a debug message in case of extension loader override,
			// not a warning, so that it doesn't scare people
			this.log.debug(`-----------------------------------------------`)
			this.log.debug(`Overriding an already existing require() hook `)
			this.log.debug(`for file extension ${dot_extension}`)
			this.log.debug(`-----------------------------------------------`)
		}

		// the list of cached modules
		const cached_modules = new Set()

		// set new loader for this extension
		Module._extensions[dot_extension] = (module, filename) =>
		{
			this.log.debug(`Loading source code for ${filename}`)

			// fallback flag
			let aborted = false

			// var source = fs.readFileSync(filename, 'utf8')
			const source = resolve(filename, () =>
			{
				this.log.debug(`Fallback to original loader`)

				// fallen back
				aborted = true

				// this message would appear if there was no loader 
				// for the extension of the filename
				if (path.extname(filename) !== dot_extension)
				{
					this.log.info(`Trying to load "${path.basename(filename)}" as a "*${dot_extension}"`)
				}

				// load the file with the original loader
				(original_loader || Module._extensions['.js'])(module, filename)
			})

			// if fallen back - exit
			if (aborted)
			{
				return
			}

			// add this file path to the list of cached modules
			cached_modules.add(filename)

			// compile javascript module from its source
			// https://github.com/nodejs/node/blob/master/lib/module.js#L379
			module._compile(source, filename)
		}

		const result = 
		{
			// uninstall the hook
			unmount: () =>
			{
				// clear require() cache for this file extension
				for (let path of cached_modules)
				{
					delete require.cache[path]
				}

				// mount the original loader for this file extension
				Module._extensions[dot_extension] = original_loader
			}
		}

		return result
	}

	// // uninstalls a previously installed require() hook for the extension
	// //
	// // extension - the file extension for which to uninstall 
	// //             the previously installed require() hook
	// //
	// unhook(extension)
	// {
	// 	this.log.debug(`Unhooking from .${extension} files loading`)
	//
	// 	// validation
	// 	validate.extension(extension)
	//
	// 	// dotted extension
	// 	const dot_extension = `.${extension}`
	//
	// 	// verify that the hook exists in the first place
	// 	if (Object.keys(this.original_loaders).indexOf(dot_extension) < 0)
	// 	{
	// 		throw new Error(`Require() hook wasn't previously installed for ${dot_extension} files`)
	// 	}
	//
	// 	// uninstall the hook
	// 	Module._extensions[dot_extension] = this.original_loaders[dot_extension]
	// 	delete this.original_loaders[dot_extension]
	// }
}

// validation
const validate =
{
	extension(extension)
	{
		// if (typeof extension !== 'string')
		// {
		// 	throw new Error(`Expected string extension. Got ${extension}`)
		// }

		if (path.extname(`test.${extension}`) !== `.${extension}`)
		{
			throw new Error(`Invalid file extension ${extension}`)
		}
	},

	resolve(resolve)
	{
		if (typeof resolve !== 'function')
		{
			throw new Error(`Resolve should be a function. Got ${resolve}`)
		}
	},

	global_hook(id, resolver)
	{
		if (!id)
		{
			throw new Error(`You must specify global hook id`)
		}

		if (path.extname(`test.${id}`) !== `.${id}`)
		{
			throw new Error(`Invalid global hook id. Expected a valid file extension.`)
		}

		validate.resolve(resolver)
	}
}

// returns a CommonJS modules source.
Require_hacker.to_javascript_module_source = function(anything)
{
	// if the asset source wasn't found - return an empty CommonJS module
	if (!exists(anything))
	{
		return 'module.exports = undefined'
	}

	// if it's already a common js module source
	if (typeof anything === 'string' && is_a_module_declaration(anything))
	{
		return anything
	}

	// generate javascript module source code based on the `source` variable
	return 'module.exports = ' + serialize(anything)
}

// detect if it is a CommonJS module declaration
function is_a_module_declaration(text)
{
	return text.indexOf('module.exports = ') === 0 ||
		/\s+module\.exports = .+/.test(text)
}