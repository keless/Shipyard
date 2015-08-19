"use strict"; //ES6

class ShipPartFactory {
	static getPartFromJson( json ) {
		var part = new ShipPartModel(json.uid);
		part.fromJson(json);
		return part;
	}
	static getPartFromType( partTypeID ) {
		var part = new ShipPartModel();
		part.fromJson({"type":partTypeID});
		return part;
	}
}

class ShipPartCatalog {
	//set the json blob catalog pulls from
	static setSource( data ) {
		this.data = data;
	}
	
	static getPartJson( partTypeID ) {
		var data = this.data[partTypeID];
		data.type = partTypeID; //inject type into json blob
		return data;
	}
}