(function(){
  var <%= name %> = Backbone.Model.extend(<%= modelData %>);
  var <%= name %>Collection = Backbone.Collection.extend({
    model: <%= name %>,
    url: '/data/<%= name %>'
  });

  if(typeof module !== 'undefined' && module.exports) {
    module.exports = {
       model: <%= name %>,
       collection: <%= name %>Collection
    };
  }
  else if(typeof window.define === 'function' && window.define.amd) {
    define(function(){
      return {
        model: <%= name %>,
        collection: <%= name %>Collection
      };
    });
  }
  else {
    window.<%= name %> = <%= name %>;
    window.<%= name %>Collection = <%= name %>Collection;
  }
}());