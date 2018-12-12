var events = null;
var participants = null; // sites and participants for each site
var characters = [];
var site = "UPMC";
var storyData = {};
var withdrawn   = [];
var transferred = [];
var substudy    = [];
var percentages = { "name": "sites", children: [] };
var percentages2 = { "name": "sites", children: [] };

function getParticipants() {
    // get info for the current user
    return jQuery.getJSON('getVisitInfo.php', { 'action': 'getParticipants' }, function(data) {
        if ("screenout" in data) {
            withdrawn = data['screenout'];
            delete data['screenout'];
        }
        if ("transferred" in data) {
            transferred = data['transferred'];
            delete data['transferred'];
        }
        if ("substudy" in data) {
            substudy = data['substudy'];
            delete data['substudy'];
        }
        participants = data;
    });
}

function getEvents() {
    return jQuery.getJSON('getVisitInfo.php', { 'action': 'getEvents' }, function(data) {
        events = data;
    });
}

function pullData(parts, site) {
    num_subject = 1;
    jQuery.getJSON('getVisitInfo.php', { 'action': 'getSiteData', 'site': site }, function(dataSite) {
        jQuery('#progress-report').hide();
        var scenes = {};
	    var missingScenes = {};
        // create the scenes based on unique_event_name
        for (var i = 0; i < events.length; i++) {
            if (events[i]['unique_event_name'] == "screener_arm_1")
                continue;
            scenes[events[i]['unique_event_name']] = [];
	        missingScenes[events[i]['unique_event_name']] = [];
        }
        // we should remove perfect participants, only if an event is missing should we show this
        var foundDark = false;
        var numGood = 1;

        var maxEvents = 0;
        // in a first pass calculate the max length for events
        for (var pidx = 0; pidx < participants[site].length; pidx++) {
            var a = [];
            var pGUID = participants[site][pidx];
            for (var i = 0; i < dataSite.length; i++) {
                if (dataSite[i]['redcap_event_name'] == "screener_arm_1") {
                    continue; // don't add screener event
                }
                if (dataSite[i]['id_redcap'] == pGUID) {
                    a.push(dataSite[i]);
                }
            }
            if (a.length > maxEvents)
                maxEvents = a.length;
        }
        maxEvents--; // we are missing some blue entries without this
        var numBad = 0;
        for (var pidx = 0; pidx < participants[site].length; pidx++) {
            var a = [];
            var pGUID = participants[site][pidx];
            for (var i = 0; i < dataSite.length; i++) {
                if (dataSite[i]['id_redcap'] == pGUID) {
                    a.push(dataSite[i]);
                }
            }
            
            data = a;
            var assent = null;
            var evs = [];
            var ev = { 'Date': null, 'Open': 0, 'event': 'assent', 'order': 0 };
            for (var i = 0; i < data.length; i++) {
                if (data[i]['redcap_event_name'] == "baseline_year_1_arm_1" && data[i]['asnt_timestamp'] !== "") {
                    assent = data[i]['asnt_timestamp'];
                    var d = moment(assent, "YYYY-MM-DD hh:mm:ss");
                    ev['Date'] = d.format('YYYY-MM-DD');
                    evs.push(ev);
                    break;
                }
            }
            var expectedEvents = []; // the events we think this participant should have
	        var missingEvents = [];
            // given today we can now calculate what events we expect for this participant
            for (var i = 0; i < events.length; i++) {
                if (events[i]['unique_event_name'] == "screener_arm_1")
                    continue;
                if (events[i]['unique_event_name'] == "baseline_year_1_arm_1") {
                    expectedEvents.push("baseline_year_1_arm_1");
                    continue;
                }
                if (moment(assent, "YYYY-MM-DD hh:mm").add(events[i]['day_offset'] + 2*events[i]['offset_max'],'days').isBefore(moment())) {
                    expectedEvents.push(events[i]['unique_event_name']);
                }
            }

            // now add the other events to this list
            // identify events by the order in events
            for (var j = 0; j < data.length; j++) {    
                for (var i = 0; i < events.length; i++) {
                    if (events[i]['unique_event_name'] == "screener_arm_1" || events[i]['unique_event_name'] == "baseline_year_1_arm_1") {
                        continue;
                    }
                    var event_name = events[i]['unique_event_name'];
                    if (event_name == data[j]['redcap_event_name']) {
                        ev2 = Object.assign({}, ev);
                        if (typeof data[j]['asnt_timestamp'] !== 'undefined' && data[j]['asnt_timestamp'] != "") {
                            ev2['Date'] = data[j]['asnt_timestamp'].split(" ")[0];
                            ev2['event'] = data[j]['redcap_event_name'];
                            ev2['order'] = i-1;
                            evs.push(ev2);
                        } else if (typeof data[j]['fu_6mo_completion_time'] !== 'undefined' && data[j]['fu_6mo_completion_time'] != "") {
                            ev2['Date'] = data[j]['fu_6mo_completion_time'].split(" ")[0];
                            ev2['event'] = data[j]['redcap_event_name'];
                            ev2['order'] = i-1;
                            evs.push(ev2);
                        } else if (typeof data[j]['mypi_completion_date'] !== 'undefined' && data[j]['mypi_completion_date'] != "") {
                            ev2['Date'] = data[j]['mypi_completion_date'].split(" ")[0];
                            ev2['event'] = data[j]['redcap_event_name'];
                            ev2['order'] = i-1;
                            evs.push(ev2);
                        }
                        // Don't use the day_one_bl_date, its a scheduled date not a real date
                        /* else if (typeof data[j]['day_one_bl_date'] !== 'undefined' && data[j]['day_one_bl_date'] !== "") {
                            ev2['Date'] = data[j]['day_one_bl_date'].split(" ")[0];
                            ev2['event'] = data[j]['redcap_event_name'];
                            ev2['order'] = i-1;
                            evs.push(ev2);
                        } */
                    }
                }
            }
            // do we have a missing event?
            var showThis = false;
            for (var j = 0; j < expectedEvents.length; j++) {
                if (expectedEvents[j] == "baseline_year_1_arm_1")
                    continue;
                var found = false;
                evs.map(function(a) {
                    if (a['event'] == expectedEvents[j]) {
                        found = true;
                    }
                });
                if (!found) {
                    showThis = true; // show this participant
                }
            }
            
            var col = "dark";
            if (!showThis) {
                if ( evs.length < (maxEvents+1) || numGood < 1) {
                    continue; // don't show this one
                } else {
                    numGood = numGood - 1;
                    col = "light";
                }
            } else {
                if (withdrawn.indexOf(pGUID) == -1 && transferred.indexOf(pGUID) == -1) {
                    numBad++;
                }
                foundDark = true;
                // we should calculate the events that are not there
                for (var i = 0; i < expectedEvents.length; i++) {
                    if (expectedEvents[i] == "baseline_year_1_arm_1")
                        continue;
                    var found = false;
                    evs.map(function(a) {
                        if (a['event'] == expectedEvents[i]) {
                            found = true;
                        }
                    });
                    if (!found) {
		                missingEvents.push(expectedEvents[i]);
                    }
                }
            }
            if (withdrawn.indexOf(pGUID) > -1) {
                col = "black";
            }
            if (transferred.indexOf(pGUID) > -1) {
                col = "grey";
            }
            if (substudy.indexOf(pGUID) > -1) {
                col = "yellow";
            }
            
            // now use evs to add for this participant data
            pS = pGUID.substr(pGUID.length - 8)
            psName = pS;
	        if (!sites.includes(site)) {
	   	      pS = "XXXX" + num_subject;
		      num_subject += 1; 
	        }
            if (col == "light") {
                pS = "norm";
            }
            characters.push({ "id": pS, "name": pS, "affiliation": col });
            for (var i = 0; i < evs.length; i++) {
                var e = evs[i]['event'];
                if (e == "assent")
                    e = "baseline_year_1_arm_1";
                scenes[e].push(pS);
            }
	        for (var i = 0; i < missingEvents.length; i++) {
                var e = missingEvents[i];
                if (e == "assent")
                    e = "baseline_year_1_arm_1";
                missingScenes[e].push(pS);		
	        }
        }
        var perc = 0;
        if (!foundDark && numBad == 0) {
            jQuery('#'+site).append("<div>&nbsp;Everything is fine for " + participants[site].length + " participants.</div>");
        } else {
            perc = 100.0*numBad/participants[site].length;
            jQuery('#'+site).append("<div style=\"display: inline-flex;\">&nbsp;" +
                                    numBad + "/" +
                                    participants[site].length +
                                    " (" + (100.0*numBad/participants[site].length).toFixed(2).replace(/[.,]00$/, "") + "%)</div>");
            if (characters.map(function(a) { return a.id; }).indexOf("DDRLC2VM") > -1) {
                console.log(JSON.stringify(scenes) + " " + JSON.stringify(missingScenes) );
            }
            storyData = { "scenes": Object.values(scenes).filter(function(a) { if (a.length == 0) return false; return true; }),
                          "characters": characters };
	        missingStoryData = { "scenes": Object.values(missingScenes).filter(function(a) { if (a.length == 0) return false; return true; }),
                          "characters": characters };
            var sceneNames = [];
            Object.keys(scenes).filter(function(a) {
                if (scenes[a].length > 0) {
                    var nam = a;
                    for (var i = 0; i < events.length; i++) {
                        if (a == events[i]['unique_event_name'])
                            nam = events[i]['event_name'];
                    }
                    sceneNames.push(nam);
                } });
            var missingSceneNames = [];
            Object.keys(missingScenes).filter(function(a) {
                if (missingScenes[a].length > 0) {
                    var nam = a;
                    for (var i = 0; i < missingEvents.length; i++) {
                        if (a == missingEvents[i]['unique_event_name'])
                            nam = missingEvents[i]['event_name'];
                    }
                    missingSceneNames.push(nam);
                } });
            drawStory(storyData, site, sceneNames, "existing events");
	        // now draw the visits that are missing
            drawStory(missingStoryData, site, missingSceneNames, "missing events");
        }
        percentages['children'].push({ "name": site, "perc": (perc+1).toFixed(2), "numBad": numBad, "total": participants[site].length });
        if (percentages['children'].length == 21) { // all sites now add total
            // add ABCD totals
            var nB = 0;
            var nT = 0;
            for (var i = 0; i < percentages['children'].length; i++) {
                nB = nB + percentages['children'][i]['numBad'];
                nT = nT + percentages['children'][i]['total'];
            }
            percentages['children'].push({ "name": "ABCD", "perc": (1+(100.0 * nB/nT)).toFixed(2), "numBad": nB, "total": nT });
            createTreemap(percentages, "Participants with any missed visits per site (%)", '#treemap');
        }

        // create another tree map for participants with more than one missed visit
        // calculate the number of missing with more than 2 events
        var parts = [];
        var keys = Object.keys(missingScenes);
        for (var i = 0; i < keys.length; i++) {
            for (var j = 0; j < missingScenes[keys[i]].length; j++) {
                parts.push(missingScenes[keys[i]][j]);
            }
        }
        parts = [...new Set(parts)];
        var eventNames = Object.keys(missingScenes);
        var numMoreThan2 = 0;
        for (var i = 0; i < parts.length; i++) { // for all participants
            var num = 0;
            for (var j = 0; j < eventNames.length; j++) {
                if (eventNames[j] == "baseline_year_1_arm_1") // ignore
                    continue;
                if (missingScenes[eventNames[j]].indexOf(parts[i])>-1) {
                    num++; // found in missing
                }
            }
            if (num > 1) {
                numMoreThan2++;
            }
        }
        percentages2['children'].push({ "name": site, "perc": ((100*numMoreThan2/participants[site].length)+1).toFixed(2).replace(/[.,]00$/, ""), "numBad": numMoreThan2, "total": participants[site].length });
        if (percentages2['children'].length == 21) { // all sites now add total
            // add ABCD totals
            var nB = 0;
            var nT = 0;
            for (var i = 0; i < percentages2['children'].length; i++) {
                nB = nB + percentages2['children'][i]['numBad'];
                nT = nT + percentages2['children'][i]['total'];
            }
            percentages2['children'].push({ "name": "ABCD", "perc": (1+(100.0 * nB/nT)).toFixed(2), "numBad": nB, "total": nT });
            createTreemap(percentages2, "Participants with 2 or more missed visits per site (%)",'#treemap2');
        }
    });
}

function createTreemap(percentages,title,where) {

    var w = 880 - 80,
        h = 400 - 180,
        x = d3.scale.linear().range([0, w]),
        y = d3.scale.linear().range([0, h]),
        color = d3.scale.category20c(),
        root,
        node;

    var treemap = d3.layout.treemap()
        .round(false)
        .size([w, h])
        .sticky(true)
        .value(function(d) { return d.perc; });

    jQuery(where).children().remove();
    var svg = d3.select(where).append("div")
        .attr("class", "chart")
        .style("width", w + "px")
        .style("height", h + "px")
        .append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
        .attr("transform", "translate(.5,.5)");

    jQuery(where).append("<div><center style='font-size: 11pt;'><i>" + title + "</i></center></div>");

    //d3.json("kinoko_takenoko.json", function(data) {
    //d3.json("party_asset.json", function(data) {
    node = root = percentages;
    // console.log(data);
    var nodes = treemap.nodes(root)
        .filter(function(d) {return !d.children; });
    
    var cell = svg.selectAll("g")
        .data(nodes)
        .enter().append("svg:g")
        .attr("class", "cell")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .on("click", function(d) { return zoom(node == d.parent ? root : d.parent); });
    
    cell.append("svg:rect")
        .attr("width", function(d) { return d.dx - 1; })
        .attr("height", function(d) { return d.dy - 1; })
        .style("fill", function(d) {return color(d.perc); });
    
    cell.append("svg:text")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr('class', 'perc-text')
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name + " " + (+d.perc-1).toFixed(1).replace(/[,.]0$/,"") + "%"; })
        .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; });

    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    cell.append("svg:text")
        .attr("x", function(d) { return 2; })
        .attr("y", function(d) { return 6; })
        .attr("dy", ".35em")
        //.attr("text-anchor", "left")
        .attr('class', 'tinytext')
        .text(function(d) { return d.numBad + "/" + numberWithCommas(d.total); })
        .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; });
    
    d3.select(window).on("click", function() { zoom(root); });
    
    d3.select("select").on("change", function() {
        //treemap.value(this.value == "size" ? size : count).nodes(root);
        treemap.value(perc).nodes(root);
        zoom(node);
    });
    
    function perc(d) {
        return d.perc;
    }
    
    function zoom(d) {
        var kx = w / d.dx, ky = h / d.dy;
        x.domain([d.x, d.x + d.dx]);
        y.domain([d.y, d.y + d.dy]);
        
        var t = svg.selectAll("g.cell").transition()
            .duration(d3.event.altKey ? 7500 : 750)
            .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
        
        t.select("rect")
            .attr("width", function(d) { return kx * d.dx - 1; })
            .attr("height", function(d) { return ky * d.dy - 1; })
        
        t.select("text")
            .attr("x", function(d) { return kx * d.dx / 2; })
            .attr("y", function(d) { return ky * d.dy / 2; })
            .style("opacity", function(d) { return kx * d.dx > d.w ? 1 : 0; });
        
        node = d;
        d3.event.stopPropagation();
    }
    
}

function drawStory(data, site, sceneNames, title) {
    //https://bl.ocks.org/drzax/81fff35393fb65255621fd0ab8d11bd7

    // Request the data
    var svg, scenes, charactersMap, width, height, sceneWidth;
    
    // Get the data in the format we need to feed to d3.layout.narrative().scenes
    scenes = wrangle(data);

    // add the names back to the scenes
    for (var i = 0; i < scenes.length; i++) {
        scenes[i]['event_name'] = sceneNames[i];
    }
    
    // Some defaults
    sceneWidth = 10;
    width = 500 + (scenes.length * sceneWidth * 4);
    height = 6000;
    labelSize = [150,15];
    
    // The container element (this is the HTML fragment);
    svg = d3.select("#"+site).append('svg')
        .attr('id', 'narrative-chart')
        .attr('width', width)
        .attr('height', height);
    
    // Calculate the actual width of every character label.
    scenes.forEach(function(scene){
        scene.characters.forEach(function(character) {
            character.width = svg.append('text')
                .attr('opacity',0)
                .attr('class', 'temp')
                .text(character.name)
                .node().getComputedTextLength()+10;
        });
    });
    
    // Remove all the temporary labels.
    svg.selectAll('text.temp').remove();
    
    // Do the layout
    narrative = d3.layout.narrative()
        .scenes(scenes)
        .size([width,height])
        .pathSpace(10)
        .groupMargin(10)
        .labelSize([250,15])
        .scenePadding([5,sceneWidth/2,5,sceneWidth/2])
        .labelPosition('left')
        .layout();
    
    // Get the extent so we can re-size the SVG appropriately.
    svg.attr('height', narrative.extent()[1]);
    
    // Draw the scenes names
    svg.selectAll('.scene').data(narrative.scenes()).enter()
        .append('g').attr('class', 'scenename')
        .attr('transform', function(d) {
            var x,y;
            x = Math.round(d.x)+0.5;
            y = Math.round(d.y)+0.5;
            return 'translate('+[x,y]+')';
        })
        .append('text')
        .attr('y', 8)
        .attr('class', 'eventname')
        .attr('transform', 'rotate(90)')
        .text(function(d) {
            return d['event_name'];
        });

    // Draw the histogram information
    desc = svg.append('g').attr('class', 'quantitativeScene')
        .attr('transform', function() {
            var x,y;
            x = 20;
            y = 20;
            return 'translate('+[x,y]+')';
        });
    desc.append('text')
        .attr('y', 8)
        .attr('class', 'quantitativeEvent')
        .text(function() {
            return title;
        });
    if (title == "missing events") {
        // loop over all existing number of missing
        var numMiss = {};
        var dist = 18;
        var characters = data.characters.reduce(function(a,b) {
            if (a.indexOf(b.id) == -1 && b.id != "norm") {
                a.push(b.id);
            }
            return a;
        }, []);
        for (var i = 0; i < characters.length; i++) {
            var c = characters[i];
            // we should remove the black pGUIDs here... 
            
            var numThere = data.scenes.reduce(function(acc, b) {
                if (b.indexOf(c) > -1)
                    acc++;
                return acc;
            },0);
            if (typeof numMiss[numThere] == 'undefined')
                numMiss[numThere] = 1;
            else
                numMiss[numThere]++;
        }
        var keys = Object.keys(numMiss);
        var count = 0;
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] == 0)
                continue;
            count++;
            desc.append('text')
                .attr('y', 8+(dist*(count)))
                .attr('class', 'quantitativeEvent')
                .text(numMiss[keys[i]] + " missed " + keys[i] + " event" + ((keys[i]>1)?"s":""));
        }
    }

    
    // Draw links
    svg.selectAll('.link').data(narrative.links()).enter()
        .append('path')
        .attr('class', function(d) {
            return 'link ' + d.character.affiliation.toLowerCase();
        })
        .attr('d', narrative.link());


    // Draw the scenes
    svg.selectAll('.scene').data(narrative.scenes()).enter()
        .append('g').attr('class', 'scene')
        .attr('transform', function(d){
            var x,y;
            x = Math.round(d.x)+0.5;
            y = Math.round(d.y)+0.5;
            return 'translate('+[x,y]+')';
        })
        .append('rect')
        .attr('width', sceneWidth)
        .attr('height', function(d){
            return d.height;
        })
        .attr('y', 0)
        .attr('x', 0)
        .attr('rx', 3)
        .attr('ry', 3);
    
    // Draw appearances
    svg.selectAll('.scene').selectAll('.appearance').data(function(d){
        return d.appearances;
    }).enter().append('circle')
        .attr('cx', function(d){
            return d.x;
        })
        .attr('cy', function(d){
            return d.y-0.5;
        })
        .attr('r', function(){
            return 2;
        })
        .attr('class', function(d){
            return 'appearance ' + d.character.affiliation;
        });
    
    
    // Draw intro nodes
    svg.selectAll('.intro').data(narrative.introductions())
        .enter().call(function(s){
            var g, text;
            
            g = s.append('g').attr('class', 'intro');
            
            g.append('rect')
                .attr('y', -4)
                .attr('x', -4)
                .attr('width', 4)
                .attr('height', 8);
            
            text = g.append('g').attr('class','text');
            
            // Apppend two actual 'text' nodes to fake an 'outside' outline.
            text.append('text');
            text.append('text').attr('class', 'color');
            
            g.attr('transform', function(d){
                var x,y;
                x = Math.round(d.x);
                y = Math.round(d.y);
                return 'translate(' + [x,y] + ')';
            });
            
            g.selectAll('text')
                .attr('text-anchor', 'end')
                .attr('y', '4px')
                .attr('x', '-8px')
                .text(function(d){ return d.character.name; })
                .on("click", function(d) {
                    window.open("https://abcd-report.ucsd.edu/applications/visit-structure/index.php?site=" +
                                site + "&pGUID=NDAR_INV" +
                                d.character.name, "_visitStructure");
                });
            
            g.select('.color')
                .attr('class', function(d){
                    return 'color ' + d.character.affiliation;
                });
            
            g.select('rect')
                .attr('class', function(d){
                    return d.character.affiliation;
                });
            
        });
    
    
    function wrangle(data) {
        
        var charactersMap = {};
        
        return data.scenes.map(function(scene){
            return {characters: scene.map(function(id){
                return characterById(id);
            }).filter(function(d) { return (d); })};
        });
        
        // Helper to get characters by ID from the raw data
        function characterById(id) {
            charactersMap = charactersMap || {};
            charactersMap[id] = charactersMap[id] || data.characters.find(function(character){
                return character.id === id;
            });
            return charactersMap[id];
        }
        
    }
    
}
jQuery('#progress-report').show();

jQuery(document).ready(function() {
    var promises = [];
    promises.push(getEvents());
    promises.push(getParticipants());
    jQuery.when.apply(jQuery, promises).then(function() {
        var sites = Object.keys(participants);
        for (var i = 0; i < site_list.length; i++) {
            if (site_list[i] == "MSSM" || site_list[i] == "TEST" || site_list[i] == "MGH")
                continue;
            jQuery('#content').append("<div class='site'><h5>" + site_list[i] + "</h5><div id='" + site_list[i] + "'></div></div>");
            pullData(participants[site_list[i]], site_list[i]);
        }
    });
    // add progress bar
    jQuery('#progress-report').show();
    
});
