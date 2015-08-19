"use strict"; //ES6

/**
 * Singleton provider
 *  ex:
 * 		var graphics = Service.get("gfx");
 */
class Service {

  //static g_services = [];
  
  static get(serviceName) {
	  if(!this.g_services) this.g_services = [];
	  
	  return this.g_services[serviceName];
  }
  
  static add(serviceName, service) {
	  if(!this.g_services) this.g_services = [];
	  this.g_services[serviceName] = service;
  }
}