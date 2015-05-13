Emotions = new Mongo.Collection( 'emotions' );

if (Meteor.isClient) {
  var transform = function ( emotion ) {
    return {
      name : emotion.readible,
      children : []
    }
  }

  var meteorLoad = function () {
    // Hey Ivan, when you get home this is what you're going to do:
    // Emotion find the first layer, then for each, find the next layer using Emotions.find({})
    // etc 

    var emotions = Emotions.find({}).fetch();

    if ( emotions.length == 0 ) {
      Meteor.setTimeout( meteorLoad, 200 );
      return;
    }

    var treeData = [];
    var numberOfTiers = 3;
    var emotions = Emotions.find({
      tier: 0
    }).fetch();

    for ( var j = 0; j < emotions.length; j++ ) {
      var transEmotion = transform( emotions[j] );

      // Get the children
      var children = Emotions.find({
        parent : emotions[j].slug
      }).fetch();

      for ( var k = 0; k < children.length; k++ ) {
        var transChild = transform( children[k] );

        // Get the childrenChildren
        var childrenChildren = Emotions.find({
          parent : children[k].slug
        }).fetch();

        for ( var l = 0; l < childrenChildren.length; l++ ) {
          var transChildChild = transform ( childrenChildren[l] );

          transChild.children.push( transChildChild );
        }

        transEmotion.children.push( transChild );
      }

      treeData.push( transEmotion ); 
    }


    // Make the tree data all the child of Paugme
    var treeTemp = {
      name : 'Paugme',
      children : []
    };

    for ( var i = 0; i < treeData.length; i++ ) {
      var temp = treeData[i];
      treeTemp.children.push(temp);
    }

    treeData = treeTemp;
    console.log( treeData );

    // ************** Generate the tree diagram  *****************
    var margin = {top: 20, right: 120, bottom: 20, left: 120},
      width = 960 - margin.right - margin.left,
      height = 800 - margin.top - margin.bottom;
      
    var i = 0;

    var diameter = 700;

    var tree = d3.layout.tree()
        .size([360, diameter / 2 - 120])
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

    var diagonal = d3.svg.diagonal.radial()
        .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height )
      .append("g")
        .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

    update( treeData );

    function update( root ) {
      var nodes = tree.nodes(root),
          links = tree.links(nodes);

      var link = svg.selectAll(".link")
          .data(links)
        .enter().append("path")
          .attr("class", "link")
          .attr("d", diagonal);

      var node = svg.selectAll(".node")
          .data(nodes)
        .enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

      node.append("circle")
          .attr("r", 4.5);

      node.append("text")
          .attr("dy", ".31em")
          .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
          .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
          .text(function(d) { return d.name; });

      node.on('mouseover', function(d) {
        link.style('stroke-width', function(l) {
          if ( d === l.source || d === l.target) {
            return 4;
          }
          
          if ( d.parent && ( d.parent == l.source || d.parent == l.target ) ) {
            return 4;
          }

          if ( d.parent && d.parent.parent && ( d.parent.parent == l.source || d.parent.parent == l.target ) ) {
            return 4;
          }

          return 2;
          });
      });

      // Set the stroke width back to normal when mouse leaves the node.
      node.on('mouseout', function() {
        link.style('stroke-width', 2);
      });
    };

    d3.select(self.frameElement).style("height", diameter - 150 + "px");
  }

  Template.chart.onCreated( meteorLoad );
}

if (Meteor.isServer) {
  var that = this;
  Migrations.add( 'load-emotions-data', function () {
    that.emotions.load();

    for (var i = 0; i < that.emotions.data.length; i++ ) {
      var emotion = that.emotions.data[i];

      Emotions.insert( emotion );
    }

    that.emotions.unload();
  } );
}
