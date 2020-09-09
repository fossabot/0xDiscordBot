const Discord = require("discord.js"),
	{ Collection } = Discord,
	fs = require("fs"),
	util = require("util"),
	path = require("path");

// Creates Client class
class Client extends Discord.Client {
	constructor(options) {
		super(options);
		this.config = require("../config");
		this.config.icons = require("./Icons");
		this.commands = new Collection();
		this.aliases = new Collection();
		this.logger = require("../helpers/logger");
		this.wait = util.promisify(setTimeout);
		this.functions = require("../helpers/functions");
		this.updateStats = require("../helpers/updateStats.js");
	}

	// This function is used to load a command and add it to the collection
	loadCommand(commandPath, commandName) {
		try {
			const props = new (require(`.${commandPath}${path.sep}${commandName}`))(this);
			props.conf.location = commandPath;
			if (props.init) props.init(this);
			this.commands.set(props.help.name, props);
			props.conf.aliases.forEach(alias => this.aliases.set(alias, props.help.name));
			return;
		} catch (e) {
			this.logger.error(e);
		}
	}

	// This function is used to unload a command
	async unloadCommand(commandPath, commandName) {
		let command;
		if (this.commands.has(commandName)) command = this.commands.get(commandName);
		else if (this.aliases.has(commandName)) command = this.commands.get(this.aliases.get(commandName));
		if (!command) return this.logger.warn(`\`${commandName}\` is not a valid command or alias`);
		// if the command has a "shutdown" script it needs to run before being unloaded
		if (command.shutdown) await command.shutdown(this);
		delete require.cache[require.resolve(`.${commandPath}${path.sep}${commandName}.js`)];
		return;
	}

	// This function is used to find guild data or create it
	async findOrCreateGuild(guild) {
		let path = `./guilds/${guild}.json`;
		if (!fs.existsSync(path)) path = "./base/Guild.json";
		let data = JSON.parse(await fs.promises.readFile(path, "utf8"));
		if (!data.id) data.id = guild;
		data.save = async function () {
			await fs.promises.writeFile(`./guilds/${this.id}.json`, JSON.stringify(this, null, "\t"), "utf8");
		};
		if (path === "./base/Guild.json") await data.save();
		return data;
	}
}

module.exports = Client;
