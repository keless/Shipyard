"use strict"; //ES6

class GameStateController
{
	static get STATE_LOADING() { return "loading"; }
	static get STATE_FLYING() { return "flying"; } 
	static get STATE_HANGAR() { return "hangar"; }
	static get STATE_BLUEPRINT() { return "blueprint"; }
	
	constructor() {
		this.state = GameStateController.STATE_LOADING;
		this.view = null;
		//todo: list states
		//loading, space/piloting, hangar
		
		EventBus.game.addListener("gotoState", function(e){
			this.gotoState(e.state, e.params);
		}.bind(this));
		
		//TODO: try to load from browser data; otherwise instanciate first time data
		var SaveData = Service.get("sd");
		this._userInventory = SaveData.load("userInventory", this.firstTimeUserInventory());
		
		SaveData.init("blueprints", this.defaultBlueprints());
		EventBus.game.addListener("resetBlueprints", function(e){
			SaveData.save("blueprints", this.defaultBlueprints());
		 }.bind(this));
	}

	gotoState( state, params ) {
		if(this.view){
			if(this.view.Destroy) this.view.Destroy();
			this.view = null;
		}
		if(this.model) {
			if(this.model.Destroy) this.model.Destroy();
			this.model = null;
		}

		switch(state) {
			case GameStateController.STATE_LOADING:
				this.view = new LoadingView( this.resourceLoadList() );
				this.state = null;
			break;
			case GameStateController.STATE_FLYING:
				this.model = new SpaceZoneModel();
				this.view = new SpaceZoneView(this.model);
			break;
			case GameStateController.STATE_HANGAR:
				this.model = new HangarEditorModel();
				this.view = new HangarEditorView(this.model);
			break;
			case GameStateController.STATE_BLUEPRINT:
				this.model = new BlueprintSelectorModel(params.blueprintToLoad);
				this.view = new BlueprintSelectorView(this.model);
			break;
		}
	}
	
	get userInventory() {
		return this._userInventory;
	}
	
	set userInventory(inv) {
		this._userInventory = inv;
	}
	
	resourceLoadList() {
		//global data;
		var resources = [
					"gfx/btn_blue.sprite",
					"gfx/btn_dark.sprite",
					"gfx/btn_white.sprite",
					"gfx/aelius_floor.jpg",
					"gfx/explosion_1.sprite",
					];
		
		for(let partType in data.shipParts) {
			var part = data.shipParts[partType];
			resources.push(part.imageName);
		}
		
		return resources;
	}
	
	firstTimeUserInventory() {
		return {
			activeShip:{"type":"f1", "category":"frame", children:[
				{"type":"t1", "category":"thruster", pos:{x:-25,y:50}},
				{"type":"t1", "category":"thruster", pos:{x:0,y:-100}, rotation:Math.PI},
				{"type":"t1", "category":"thruster", pos:{x:25,y:50}}
			] },
			spareParts:{"f1":4, "t1":2, "t2":2, "r1":1, "c1":1, "b1":2, "m1":2, "l1":2}
		}
	}
	
	defaultBlueprints() {
		return {
			"Skiff":{"parts":{"type":"f1", children:[
				{"type":"t1", pos:{x:-25,y:75}},
				{"type":"t1", pos:{x:0,y:-100}, rotation:Math.PI},
				{"type":"t1", pos:{x:25,y:75}},
				{"type":"r1", pos:{x:0,y:20}},
				{"type":"c1", pos:{x:0,y:-55}},
				{"type":"m1", pos:{x:0, y:0}}
				]}
			}
		};
	}
	
}