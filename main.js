function init(datafile,cond) {
  d3.csv(datafile, display);
  trialtypes = cond;
}

function display(rows) {
  console.log("Loaded", rows.length, "data rows.");
  console.log("Converting...");

  data = convert(rows);
  console.log(data);

  // now do the actual visualization
  var colors = d3.scale.category20();
  var trials_per_subject = d3.max(data, function(d) { return d.length; });
  var trial_count = data.length * trials_per_subject;
  
  if(trialtypes == 'comp') {
	var types = ['sample1', 'sample2', 'target', 'foil', 'NotOnAOI'];
} else if (trialtypes == 'singles'){var types = ['sample', 'target', 'foil', 'NotOnAOI'];
}

  var bar_height = 30, bar_dist = 40, lgap = 55, rgap = 10, tgap = 80;
  var w = 1000, h = trial_count * bar_dist;
  max_t = get_max_time(data);
  map_time = d3.scale.linear().domain([0,max_t]).range([lgap, w]);
  var map_type = function(type) {
    var types = {sample1: "blue", sample2:"lightblue", target: "green", foil: "red", NotOnAOI: "white", sample:"blue"};
    return types[type];
  }
  
  d3.select("body")
    .append("svg")
    .attr('width', w+lgap+rgap)
    .attr('height', h+tgap);
  
  axis = d3.svg.axis()
    .orient('top')
    .scale(map_time)
    .tickFormat(function(x) { return x + ' s'});

  var liw = 100;
  var legend_items = d3.select('svg')
    .append('g')
    .attr('transform', 'translate(55,10)')
    .attr('class', 'legend')
    .selectAll('g.legend-item')
    .data(types)
    .enter()
    .append('g')
    .attr('class', 'legend-item');
  
  legend_items
    .append('rect')
    .attr('x', function(d,i) { return liw*i })
    .attr('y', 0)
    .attr('width', 20)
    .attr('height', 20)
    .style('fill', function(d) { return map_type(d) })
    .style('stroke', 'black');
  
  var xi = 0;
  
  legend_items
    .append('text')
    .attr('x', function(d,i) { return 26+liw*i })
    .attr('y',10)
    .text(function(d) { return d});

  d3.select('svg')
    .append('g')
    .attr('transform', 'translate(0,' + (tgap-10) + ')')
    .attr('class', 'axis')
    .call(axis);
  
  var subjects = d3.select('svg')
    .selectAll('g.subject')
    .data(data)
    .enter()
    .append('g')
    .attr('class', 'subject')
    .attr('transform', function(d, i) {
      return "translate(0," + (i * trials_per_subject * bar_dist + tgap) + ")"; 
    });

  subjects.append('text')
    .attr('class', 'subject_no')
    .attr('x', 20)
    .attr('y', bar_height/2)
    .text(function(d, i) { return i+1; });

  var trials = subjects
    .selectAll('g.trial')
    .data(function(d) { return d})
    .enter()
    .append('g')
    .attr('class', 'trial')
    .attr('transform', function(d, i) {
      return "translate(0," + (i * bar_dist) + ")"; 
    });
  
  trials.append('line')
    .attr('class', function(d, i) {
      return (i==trials_per_subject-1) ? 'separator-subject' : 'separator-trial'
    })
    .attr('x1', 10)
    .attr('x2', w+lgap+rgap)
    .attr('y1', (bar_dist+bar_height)/2)
    .attr('y2', (bar_dist+bar_height)/2)
    
  trials.append('text')
    .attr('class', 'trial_no')
    .attr('x', 40)
    .attr('y', bar_height/2)
    .text(function(d, i) { return i+1; });
    
  trials
    .selectAll('rect.fixation')
    .data(function(d) { return d })
    .enter()
    .append('rect')
    .attr('class', 'fixation')
    .attr('x', function(d) { return map_time(d.t0) })
    .attr('y', 0)
    .attr('height', bar_height)
    .attr('width', function(d) { return map_time(d.dur)-map_time(0) })
    .attr('fill', function(d) { return map_type(d.type) })
  
  trials.append('rect')
    .attr('class', 'border')
    .attr('x', map_time(0))
    .attr('y', 0)
    .attr('height', bar_height)
    .attr('width', function(d) {
      if (!d.length) return 0;
      return map_time(d[d.length-1].t0 + d[d.length-1].dur)-map_time(0);
    })
    .attr('stroke', 'black')
    .attr('fill', 'none');
  
  var xpos = map_time(max_t)+25;
  trials.append('text')
    .attr('class', 'acc')
    .attr('x', xpos)
    .attr('y', bar_height/2)
    .attr('fill', function(d) {
      if (!d.length || d[0].acc) return 'darkgreen';
      return 'darkred';
    })
    .text(function(d) {
      if (!d.length) return;
      return (d[0].acc) ? 'ok' : '--'
    });
}


function get_max_time(data) {
  var max_time = 0;
  for (var s=0; s<data.length; s++) {
    for (var t=0; t<data[s].length; t++) {
      var trial = data[s][t];
      if (trial.length == 0) continue;
      var time = trial[trial.length-1].t0 + trial[trial.length-1].dur;
      if (time > max_time) max_time = time;
    }
  }
  return max_time;
}

function get_time(row) {
  return parseInt(row.TimestampSec)
         + parseInt(row.TimestampMicrosec)/1000000;
}

// Takes the row-based data read from the cvs file, figures out the time blocks an AOI (area
// of interest) was fixated and groups these blocks by subject number. It returns an array of
// subject arrays, each containing trial arrays which contain fixation-blocks like
// {type: string, t0: in_sec, dur: in_sec}.
function convert(rows) {
  var data = [], last_fix, t0;
  for (var i=0; i<rows.length; i++) {
    var row = rows[i];
    var s_id = +row.Subject-1;
    var t_id = +row.TrialId-1;
    if (!data[s_id]) data[s_id] = [];
    if (!data[s_id][t_id]) {
      data[s_id][t_id] = [];
      t0 = get_time(row);
    }
    if (row.Switch == "NA" || row.Switch == "YES" || data[s_id][t_id].length == 0) {
      last_fix = {type: row.AOI
                ,t0: get_time(row)-t0
                ,dur: 0
                ,acc: +row.ACC};
      data[s_id][t_id].push(last_fix);
    } else if (row.Switch == "NO") {
      last_fix.dur = get_time(row) - t0 - last_fix.t0;
      if (last_fix.acc != +row.ACC) {
	    console.log('row', i);
		console.log('ACC was', last_fix.acc, 'but now its', row.ACC)
		throw "inconsistant ACC field found at line " + i;
	  }
    }
  }

  console.log(data)
  
  for (var s=0; s<data.length; s++) {
    for (var t=0; t<data[s].length; t++) {
      var trial = data[s][t];
      if (!trial) { data[s][t] = []; continue; }
      // if there is a gap (saccade) between two fixations, increase the duration of the first fixation
      // so include the saccade. We could also remove the saccade time intervals from the data, but this
      // would alter the total length of the trial, which we don't want.
      for (var i=0; i<trial.length-1; i++) {
        trial[i].dur += trial[i+1].t0 - (trial[i].t0 + trial[i].dur);
      }      
    }
  }
  return data;
}
