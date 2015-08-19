"use strict"; //ES6

class SaveData {
	constructor( appPrefix ) {
		this.appPrefix = appPrefix;
		Service.add("sd", this);
		
		this.verbose = true;
	}
	init(strName, objData) {
		var val = localStorage.getItem(this.appPrefix + strName);
		if(val === null) {
			this.save(strName, objData);
			if(this.verbose) console.log("saved initial value for " + strName)
		}
		//if already saved, dont set value
	}
	save(strName, objData) {
		localStorage.setItem(this.appPrefix + strName, JSON.stringify(objData) );
	}
	load(strName, defaultValue) {
		var val = localStorage.getItem(this.appPrefix + strName);
		if(val === null) {
			if(this.verbose) console.log("used default value for load of ", strName);
			return defaultValue;
		}
		return JSON.parse(val);
	}
	clear(strName) {
		localStorage.removeItem(this.appPrefix + strName);
	}
}