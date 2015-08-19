"use strict"; //ES6
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: jQuery using "jQuery()"" format, not "$()"
//#include js/framework/Graphics.js
//#include js/framework/ResourceProvider.js

/**
 * Tiled map .json loader and renderer
 *   also reads physics rectangles with the format:
 * 
 */
 class TiledMap {
	constructor( path, outputW, outputH ) {
		this.path = path.substring(0, path.lastIndexOf("/")+1);
		this.width = outputW;
		this.height = outputH;
		this.isLoaded = false;
		
		this.imgLayers = [];
		this.groundRects = [];
		this.wallRects = [];
		this.spawnPts = [];
		
		this.pPhysics = null;
		this.physicsBodies = [];
		
		this.debugShowBoxes = false;
	}
	
		//called by ResourceProvider
	LoadFromJson( dataJson ) {
		var rp = Service.get("rp");
		this.data = dataJson;
		
		for( var layerIdx=0; layerIdx < this.data.layers.length; layerIdx++ ) {
			var layer = this.data.layers[layerIdx];
			if( layer.type == "imagelayer" ) {
				//image layer
				this.imgLayers.push( layer );
				
				//preload image
				rp.loadImage(this.path + layer.image);
			}
			else if( layer.type == "objectgroup" && layer.name == "ground") {
				//object layer
				for( var objIdx=0; objIdx < layer.objects.length; objIdx++ ) {
					var object = layer.objects[objIdx];
					this.groundRects.push(object);
				}
			}
			else if( layer.type == "objectgroup" && layer.name == "wall") {
				//object layer
				for( var objIdx=0; objIdx < layer.objects.length; objIdx++ ) {
					var object = layer.objects[objIdx];
					this.wallRects.push(object);
				}
			}
			else if( layer.type == "objectgroup" && layer.name == "spawn") {
				//object layer
				for( var objIdx=0; objIdx < layer.objects.length; objIdx++ ) {
					var object = layer.objects[objIdx];
					this.spawnPts.push(object);
				}
			}
		}
		this.isLoaded = true;
	}
	
	Draw( gfx, offsetX, offsetY ) {
		if(!this.isLoaded) return;
		
		var rp = Service.get("rp");
		for( var layerIdx=0; layerIdx < this.imgLayers.length; layerIdx++ ) {
			var layer = this.data.layers[layerIdx];
			//draw image layer
			var layerImg = rp.getImage(this.path + layer.image);
			if(layerImg) {
				gfx.drawImage(layerImg, offsetX + layer.x, offsetY + layer.y);
			}
		}
		
		if(this.debugShowBoxes) {
			//draw physics boxes
			for( var objIdx=0; objIdx < this.groundRects.length; objIdx++ ) {
					var object = this.groundRects[objIdx];
					gfx.drawRect(offsetX + object.x, offsetY + object.y, object.width, object.height);
			}
			for( var objIdx=0; objIdx < this.wallRects.length; objIdx++ ) {
					var object = this.wallRects[objIdx];
					gfx.drawRect(offsetX + object.x, offsetY + object.y, object.width, object.height);
			}
			//draw spawn points
			for( var objIdx=0; objIdx < this.spawnPts.length; objIdx++ ) {
					var object = this.spawnPts[objIdx];
					gfx.drawRect(offsetX + object.x, offsetY + object.y, object.width, object.height);
			}
		}
	}
	
	AttachPhysics( physics ) {
		if(!this.isLoaded) return;
		if(this.physics != null) {
			console.log("warn: already attached to physics");
			return;
		}
		this.physics = physics;
		for( var objIdx=0; objIdx < this.groundRects.length; objIdx++ ) {
				var object = this.groundRects[objIdx];
				//gfx.drawRect(object.x, object.y, object.width, object.height);
				var stdGroundHeight = 10;
				object.height = stdGroundHeight;
				var body = physics.createStaticBody(object.x, object.y, object.width, object.height);
				body.SetUserData({"objLink":this,"isGround":true, "isWall":false});
				this.physicsBodies.push(body);
		}
		
		for( var objIdx=0; objIdx < this.wallRects.length; objIdx++ ) {
				var object = this.wallRects[objIdx];
				//gfx.drawRect(object.x, object.y, object.width, object.height);
				var body = physics.createStaticBody(object.x, object.y, object.width, object.height);
				body.SetUserData({"objLink":this, "isGround":false, "isWall":true});
				this.physicsBodies.push(body);
		}
	}
	DetatchPhysics() {
		if(!this.physics) return;
		
		for( var objIdx=0; objIdx < this.physicsBodies.length; objIdx++ ) {
			var body = this.physicsBodies[objIdx];
			this.physics.destroyBody(body);
		}
		this.physics = null;
	}
	
	GetSpawnPoint( idx ) {
		return this.spawnPts[idx];
	}
	GetRandomSpawn() {
		var min = 0;
		var max = this.spawnPts.length - 1;
		var idx = Math.floor(Math.random() * (max - min)) + min;
		return this.spawnPts[idx];
	}
	GetSpawnFurthestFrom( x,y ) {
		var dist = 0;
		var idx = 0;
		for(var i=0; i<this.spawnPts.length; i++) {
			var thisDistEst = Math.abs(this.spawnPts.x - x) + Math.abs(this.spawnPts.y - y);
			if(thisDistEst > dist) idx = i;
		}
		
		return this.spawnPts[idx];
	}
 }