"use strict"; //ES6

class ShipView {
	
	
	//expects partModel to have 'uid' 'pos' 'rotation' 'category' and optionally 'imageName'
	static CreatePartView( partModel ) {
		var partView = new NodeView();
		partView.uid = partModel.uid; //associate a view with a model indirectly via UID
		partView.pos = partModel.pos.clone();
		partView.rotation = partModel.rotation;
		if(partModel.imageName) {
			var RP = Service.get("rp");
			var img = RP.getImage(partModel.imageName);
			partView.setImage(img);
			
			//add getArea function based on image size
			var w = img.width; var h = img.height;
			partView.getArea = function() {
				return new Rect2D( -w/2, -h/2, w, h );
			}
			
			//dbg - draw bounds
			partView.addCustomDraw(function(g, x,y, ct) {
				g.drawRectOutlineEx( x,y, w,h, "#00FFFF" );
			});
		}
		
		if(partModel.category == "thruster") {
			//debug - draw thrust amount as vector from thruster parts
			//todo: attach particle system here instead?
			
			//partView.particleSystem = new ParticleSystem(10);
			partView.addCustomDraw(function(gfx, x,y, ct) {
				var amt = partModel.control * partModel.maxThrust;
				//partView.particleSystem.draw(gfx, x, y, ct);
				if(amt > 0 ) {
					gfx.drawLineEx(x + 0, y + 0, x + 0, y + amt, "#FF0000");
					//partView.particleSystem.spawn(0,0, 0, amt, ct, 0.5);
				}
			});
		}
		
		if(partModel.children) {
			for(let child of partModel.children) {
				var childView = ShipView.CreatePartView(child);
				partView.addChild(childView);
			}
		}
		
		//useful for hangar editor drag and drop feature, true if part can mount children parts
		partView.isMountable = partModel.isMountable;
		
		return partView;
	}
	
	static CreateShipView( shipModel ) {
		if(shipModel.frame.category != "frame") {
			console.warn("expected root part to be a frame");
		}
		
		var shipView = new NodeView();
		var frameView = this.CreatePartView( shipModel.frame );
		shipView.addChild(frameView);
		
		shipView.addCustomDraw(function(g, x,y, ct){
			var aabb = shipModel.AABB.total;
			if(aabb) {
				g.drawRectOutline(aabb.x + aabb.w/2, aabb.y + aabb.h/2, aabb.w, aabb.h);
			}
		});
		
		var com = new NodeView();
		com.setCircle(5);
		com.pos = shipModel.CoM.pos.clone();
		shipView.addChild(com);
		shipView.comDotView = com;

		return shipView;
	}
}