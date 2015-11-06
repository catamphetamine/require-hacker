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

const require_hacker = 
{
	preceding_abstract_path_resolvers: [],
	abstract_path_resolvers: [],

	abstract_path_resolved_modules: {},

	occupied_file_extensions: new Set(),

	// logging
	log: new Log('require-hook', { debug: false }), // this.options.debug

	// installs a global require() hook for all paths 
	//
	// (if these paths are certain to exist in the filesystem
	//  and if you need only a specific file extension
	//  then use the .hook(extension, resolve) method instead)
	//
	// id - a meaningful textual identifier
	//
	// resolve - a function which takes one parameter:
	//
	//             the path to be resolved
	//
	//           must return either a javascript CommonJS module source code
	//           (i.e. "module.exports = ...", etc)
	//           or it can return nothing to fall back to the original Node.js loader
	//
	// returns an object with an .undo() method
	//
	// options:
	//
	//   precede_node_loader:
	//     
	//     true  - this require() hook will intercept all require() calls
	//             before they go into the original Node.js loader
	//    
	//     false - this require() hook will only intercept those require() calls
	//             which failed to be resolved by the original Node.js loader
	//
	//     default value: false
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

				require_hacker.abstract_path_resolved_modules[resolved_path] = source

				return resolved_path
			}
		}

		if (options.precede_node_loader)
		{
			require_hacker.preceding_abstract_path_resolvers.push(resolver_entry)
		}
		else
		{
			require_hacker.abstract_path_resolvers.push(resolver_entry)
		}

		const hook = this.hook(id, path => 
		{
			const source = require_hacker.abstract_path_resolved_modules[path]
			delete require_hacker.abstract_path_resolved_modules[path]
			return source
		})

		const result =
		{
			unmount: () =>
			{
				// javascript arrays still have no .remove() method in the XXI-st century
				require_hacker.preceding_abstract_path_resolvers = require_hacker.preceding_abstract_path_resolvers.filter(x => x !== resolver_entry)
				require_hacker.abstract_path_resolvers = require_hacker.abstract_path_resolvers.filter(x => x !== resolver_entry)
				hook.unmount()
			}
		}

		return result
	},

	// installs a require() hook for the extension
	//
	// extension - a file extension to hook into require()s of
	//             (examples: 'css', 'jpg', 'js')
	//
	// resolve   - a function that takes one parameter: 
	//
	//               the path requested in the require() call 
	//
	//             must return either a javascript CommonJS module source code
	//             (i.e. "module.exports = ...", etc)
	//             or it can return nothing to fall back to the original Node.js loader
	//
	hook(extension, resolve)
	{
		this.log.debug(`Hooking into *.${extension} files loading`)
		
		// validation
		validate.extension(extension)
		validate.resolve(resolve)

		// occupy file extension
		this.occupied_file_extensions.add(extension)

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

			// var source = fs.readFileSync(filename, 'utf8')
			const source = resolve(filename)

			if (!exists(source))
			{
				this.log.debug(`Fallback to original loader`)

				// this message would appear if there was no loader 
				// for the extension of the filename
				if (path.extname(filename) !== dot_extension)
				{
					this.log.info(`Trying to load "${path.basename(filename)}" as a "*${dot_extension}"`)
				}

				// load the file with the original loader
				return (original_loader || Module._extensions['.js'])(module, filename)
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

				// free file extension
				this.occupied_file_extensions.delete(extension)
			}
		}

		return result
	},

	// returns a CommonJS modules source.
	to_javascript_module_source(anything)
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
			throw new Error(`Invalid file extension "${extension}"`)
		}

		// check if the file extension is already occupied
		if (require_hacker.occupied_file_extensions.has(extension))
		{
			throw new Error(`File extension "${extension}" is already occupied by require-hacker`)
		}
	},

	resolve(resolve)
	{
		if (typeof resolve !== 'function')
		{
			throw new Error(`Resolve should be a function. Got "${resolve}"`)
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
			throw new Error(`Invalid global hook id "${id}". Expected a valid file extension.`)
		}

		// check if the file extension is already occupied
		if (require_hacker.occupied_file_extensions.has(id))
		{
			throw new Error(`File extension "${id}" is already occupied by require-hacker`)
		}

		validate.resolve(resolver)
	}
}

// instrument Module._findPath
// https://github.com/nodejs/node/blob/master/lib/module.js#L335-L341
Module._findPath = (...parameters) =>
{
	const request = parameters[0]
	// const paths = parameters[1]

	// preceeding resolvers
	for (let resolver of require_hacker.preceding_abstract_path_resolvers)
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
	for (let resolver of require_hacker.abstract_path_resolvers)
	{
		const resolved = resolver.resolve(request)
		if (typeof resolved !== 'undefined')
		{
			return resolved
		}
	}

	return false
}

// detect if it is a CommonJS module declaration
function is_a_module_declaration(text)
{
	return text.indexOf('module.exports = ') === 0 ||
		/\s+module\.exports = .+/.test(text)
}

export default require_hacker