var events = null;
var participants = null; // sites and participants for each site
// pGUID has been defined in index.php
var transferred = [];
var substudy    = [];
var screenout   = [];

function getParticipants(pullAll) {
    if (!pullAll) { // only show a single participant
        // add the
        participants = {};
        participants[site] = [pGUID];
        jQuery('#participants').append("<option></option>");
        jQuery('#participants').append("<option site='" + site + "'>" + pGUID + "</option>");
        jQuery('#participants').select2({ placeholder: "Please select a participant" });
        return Promise.resolve();
    }
    // get info for the current user
    return jQuery.getJSON('getVisitInfo.php', { 'action': 'getParticipants' }, function(data) {
        participants = data;
        jQuery('#participants').append("<option></option>");
        transferred = data['transferred'];
        substudy    = data['substudy'];
        screenout   = data['screenout'];
        delete data['screenout'];
        delete data['substudy'];
        delete data['transferred'];
        sites = Object.keys(data);
        for (var i = 0; i < sites.length; i++) { // loop over sites
            for (var j = 0; j < data[sites[i]].length; j++) {
                jQuery('#participants').append("<option site='" + sites[i] + "'>" + data[sites[i]][j] + "</option>");
            }
        }
        jQuery('#participants').select2({ placeholder: "Please select a participant" });
    });
}

function getEvents() {
    return jQuery.getJSON('getVisitInfo.php', { 'action': 'getEvents' }, function(data) {
        events = data;
    });
}

function drawShort( data ) {
    jQuery('#short').children().remove();
    var assent = null;
    for (var i = 0; i < data.length; i++) {
        if (data[i]['event'] == 'assent') {
            assent = moment(data[0]['Date'], "YYYY-MM-DD"); //moment(data, "YYYY-MM-DD hh:mm:ss");
            break;
        }
    }
    var today = moment();
    var oneMore = false;
    // lets draw some boxes for each interval between events
    for (var i = 0; i < events.length; i++) {
        if (events[i]['unique_event_name'] == "screener_arm_1")
            continue;
        // what is this date? (based on the assent date)
        var evdate = moment(assent).add(events[i]['day_offset'], 'day');
        if (moment(evdate) > moment(today)) {
            oneMore = true;
        }
        var eventDate = "&nbsp;";
        var col = "unknown";
        var visitCol = "borderunknown";
        var str = "";
        if (events[i]['unique_event_name'] == 'baseline_year_1_arm_1') {
            eventDate = moment(assent).add(events[i]['day_offset'], 'day').format("MMM Do YYYY");
            str = "bl";
            visitCol = "bordergreen";
        } else {
            str = Math.round(moment.duration(events[i]['day_offset'],'days').asYears()) + " year";
        }
        for (var j = 0; j < data.length; j++) {
            // for baseline the data[j]['event'] is actually "assent", should be changed to simplify the logic here
            if (data[j]['event'] == events[i]['unique_event_name']) {
                // found this event
                eventDate = moment(data[j]['Date']).format("MMM Do YYYY");
                col = "green";
                // we can calculate now if the visit is early late or on time
                var expectedDate = moment(assent).add(events[i]['day_offset'], 'day');
                var actualDate   = moment(data[j]['Date']);
                var dateDiff = moment(expectedDate).diff(actualDate,'days');
                // assuming symmetric visit dates
                if (Math.abs(dateDiff) > events[i]['offset_min']) {
                    visitCol = "borderorange";
                } else {
                    visitCol = "bordergreen";
                }
                break;
            }
        }

        // what type of visit is this? (6month, 1 year or 2 years)
        var visitType6  = Math.floor(Math.floor(events[i]['day_offset']/10.0) % Math.floor(180/10.0)) == 0;
        var visitType12 = Math.floor(Math.floor(events[i]['day_offset']/10.0) % Math.floor(365/10.0)) == 0;
        var visitType24 = Math.floor(Math.floor(events[i]['day_offset']/10.0) % Math.floor(730/10.0)) == 0;
        var visitType = "";
        if (!visitType24 && !visitType12 && !visitType6) { // happens after 2 years, 910 is not 900
            visitType = "type6";
            str = Math.round(moment.duration(events[i]['day_offset'],'days').asMonths()) + " month";
        }
        if (visitType24) {
            visitType = "type24";
        } else if (visitType12) {
            visitType = "type12";
        } else if (visitType6) {
            visitType = "type6";
            str = Math.round(moment.duration(events[i]['day_offset'],'days').asMonths()) + " month";
        }
        
        if (events[i]['unique_event_name'] != "baseline_year_1_arm_1") {
            jQuery('#short').append("<div class='eventbox " + col + "' title='" + events[i]['event_name'] + "'></div>");
            if (col != "unknown") {
                jQuery('#short').append("<div class='to' title='Expected date " + events[i]['unique_event_name'] + "'>" + moment(assent).add(events[i]['day_offset'], 'day').format("MM/DD/YYYY") + "</div>");
            } else {
                var startDate = moment(assent).add(events[i]['day_offset']-events[i]['offset_min'], 'day');
                var endDate   = moment(assent).add(events[i]['day_offset']+events[i]['offset_max'], 'day');
                jQuery('#short').append("<div class='startDateU'>" + startDate.format("MM/DD") + "</div>");
                jQuery('#short').append("<div class='endDateU'>" + endDate.format("MM/DD") + "</div>");
                jQuery('#short').append("<div class='to' title='Expected date " + events[i]['unique_event_name'] + "'>" + moment(assent).add(events[i]['day_offset'], 'day').format("MM/DD/YYYY") + "</div>");
            }
        }
        jQuery('#short').append("<div class='te " + visitCol + "' title='Actual date " + events[i]['event_name'] + "'>" + eventDate + "</div>");
        jQuery('#short').append("<div class='" + visitType + "'><div class='et'>" + str + "</div></div>");
        if (oneMore) {
            break;
        }
    }
}

var startyear, endyear;
var tooltip;
function drawCalendars( data ) {
    // http://jsfiddle.net/henbox/d3y14zsq/1/
    // date is 2017-07-13 11:22
    var ev = [];
    ev.push({'Date': moment().format("YYYY-MM-DD"), 'Open': 40, 'event': 'today' });
    
    var assent = null;
    for (var i = 0; i < data.length; i++) {
        if (data[i]['event'] == 'assent') {
            assent = moment(data[0]['Date'], "YYYY-MM-DD"); //moment(data, "YYYY-MM-DD hh:mm:ss");
        } else {
            ev.push({'Date': data[i]['Date'], 'Open': 0, 'event': data[i]['event'] });
        }
    }
    if (assent == null) {
        alert("Error: no assent date found for this pGUID");
        return;
    }
    
    startyear = assent.year();
    var maxdays = events.reduce(function(a,b) {
        var tdays = b['day_offset'] + b['offset_max'];
        var tdays2 = a['day_offset'] + a['offset_max'];
        if ( tdays > tdays2) {
            return b;
        } else {
            return a;
        }
    });
    // endyear = moment(assent).add(maxdays['day_offset'] + maxdays['offset_max'],'day').year();
    endyear = moment().add(2,'year').year();
    console.log("got the following assent date: " + assent.format());

    ev.push({'Date': moment(assent).format('YYYY-MM-DD'), 'Open': 0, 'event': 'Baseline Visit' });
    for (var i = 0; i < events.length; i++) {
        if (events[i]['unique_event_name'] == 'screener_arm_1' || events[i]['unique_event_name'] == 'baseline_year_1_arm_1')
            continue;
        // mark the days before and after each event
        d1 = moment(assent).add(events[i]['day_offset']-events[i]['offset_min'], 'day');
        d2 = moment(assent).add(events[i]['day_offset']+events[i]['offset_max'], 'day');
        // for all these days add an entry into ev
        for (var j = 0; j < events[i]['offset_min'] + events[i]['offset_max']; j++) {
            // don't on the day itself
            var dd = moment(d1).add(j,'day').format('YYYY-MM-DD');
            if (j == events[i]['offset_min'] || moment().format("YYYY-MM-DD") == dd) {
                ev.push({
                    'Date': dd,
                    'Open': 200,
                    'event': events[i]['event_name']
                });
            } else {
                ev.push({
                    'Date': dd,
                    'Open': events[i]['offset_min'] + events[i]['offset_max'],
                    'event': events[i]['event_name']
                });
            }
        }
    }    
    
    var cellSize = 17, // cell size
        paddingSize = 10,
        height = 960,
        width = cellSize * 7 + (paddingSize * 2);
    
    
    var day = d3.time.format("%w"),
        week = d3.time.format("%U"),
        percent = d3.format("d"),
        format = d3.time.format("%Y-%m-%d");
    
    var color = d3.scale.quantize()
        .domain([0, 665])
        .range(d3.range(20).map(function (d) {
            return "q" + d + "-11";
        }));

    jQuery('#graphics').children().remove();
    var svg = d3.select("#graphics").selectAll("svg")
        .data(d3.range(startyear, endyear))
        .enter().append("div").attr("class", "block").attr("width", width)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "RdYlGn")
        .append("g")
        .attr("transform", "translate(" + paddingSize + ",20)");
    
    svg.append("text")
        .attr("transform", "translate(" + width/2 + "," + -5 + ")")
        .style("text-anchor", "middle")
        .text(function(d) { return d; });

    /*tooltip = d3.select("body")
        .append("div")
        .attr("class", "tt")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .style("background", "#000")
        .text("a simple tooltip"); */
    
    var rect = svg.selectAll(".day")
        .data(function (d) {
            return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1));
        })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("y", function (d) {
            return week(d) * cellSize;
        })
        .attr("x", function (d) {
            return day(d) * cellSize;
        })
        .datum(format);

    rect.append("title")
        .text(function (d) {
            return d;
        });

    //rect.on("mouseover", function(d) { tooltip.text(d); return tooltip.style("visibility", "visible"); })
    //    .on("mousemove", function() { return tooltip.style("top", (d3.event.pageY-10)+"px").style("left", (d3.event.pageX+10)+"px"); })
    //    .on("mouseout", function() { return tooltip.style("visibility", "hidden"); });

    svg.selectAll(".month")
        .data(function (d) {
            return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1));
        })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    // Commenting out so I can use 'pre' data in JSFiddle
    // as per: http://stackoverflow.com/questions/22890836/loading-external-csv-file-in-jsfiddle
    //d3.csv("dji.csv", function(error, csv) {

    //<pre id="data">
    //Date,Open,High,Low,Close,Volume,Adj Close
    //2010-10-01,10789.72,10907.41,10759.14,10829.68,4298910000,10829.68
    
    
    //var csvdata = d3.csv.parse(d3.select("pre#data").text());
    csvdata = ev;

    var data = d3.nest()
        .key(function (d) {
            return d.Date;
        })
        .rollup(function (d) {
            // return (d[0].Close - d[0].Open) / d[0].Open;
            return d[0].Open;
        })
        .map(csvdata);
    var data2 = d3.nest()
        .key(function (d) {
            return d.Date;
        })
        .rollup(function (d) {
            return d[0].event;
        })
        .map(csvdata);

    rect.filter(function (d) {
            return d in data;
        })
        .attr("class", function (d) {
            var da1 = moment(d, "YYYY-MM-DD");
            var muted = "";
            if (moment().diff(da1,'minutes') < 0) {
                muted = " muted";
            }
            // if this is today we should show today
            if (moment().isSame(da1,'day')) {
                muted = muted + " today";
            }
            
            return "day " + color(data[d]) + muted;
        })
        .select("title")
        .text(function (d) {
            return moment(d).format("ddd, DD MMMM, YYYY") + ": " + data2[d];
        });

    function monthPath(t0) {
        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
            d0 = +day(t0),
            w0 = +week(t0),
            d1 = +day(t1),
            w1 = +week(t1);
        return "M" + d0 * cellSize + "," + (w0) * cellSize + "H" + 7 * cellSize + "V" + (w1) * cellSize + "H" + (d1 + 1) * cellSize + "V" + (w1 + 1) * cellSize + "H" + 0 + "V" + (w0 + 1) * cellSize + "H" + d0 * cellSize + "Z";
    }
    var x = jQuery('rect.today').attr('x');
    var y = jQuery('rect.today').attr('y');
    //jQuery('rect.today').after("<text x='"+x+"' y='"+y+"'>T</text>");
    addText("T", 'rect.today', x, y);
}

function SVG(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function addText( t, elem, x, y) {
    var $svg = jQuery(elem);
    var newelem = jQuery(SVG('text')).attr('x', +x+4).attr('y',+y+14);
    newelem.append("T");
    $svg.after(newelem);
}

jQuery(document).ready(function() {
    var pullAllParticipants = true;
    if (typeof pGUID !== 'undefined' && typeof site !== 'undefined') {
        pullAllParticipants = false;
    }
    
    var promises = [];
    promises.push(getEvents());
    promises.push(getParticipants(pullAllParticipants));
    jQuery.when.apply(jQuery, promises).then(function() {
        // done with pulling data from REDCap
        if (!pullAllParticipants) {
            setTimeout(function() {
                // set the pGUID into the select and trigger change
                jQuery('#participants').val(pGUID).trigger("change");
            }, 100);
        }
    });
    jQuery('#participants').on('change', function() {
        pGUID = jQuery('#participants').val();
        jQuery.getJSON('getVisitInfo.php', { 'action': 'getData', 'participant': jQuery('#participants').val(), 'site': jQuery('#participants option:selected').attr('site') }, function(data) {
            console.log("got values back from REDCap");
            var assent = null;
            var evs = [];
            var ev = { 'Date': null, 'Open': 0, 'event': 'assent' };
            for (var i = 0; i < data.length; i++) {
                if (data[i]['redcap_event_name'] == "baseline_year_1_arm_1" && data[i]['asnt_timestamp'] !== "") {
                    assent = data[i]['asnt_timestamp'];
                    var d = moment(assent, "YYYY-MM-DD hh:mm:ss");
                    ev['Date'] = d.format('YYYY-MM-DD');
                    evs.push(ev);
                    break;
                }
            }
            if (assent == null) {
                return; // give up
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
                            evs.push(ev2);
                        } else if (typeof data[j]['fu_6mo_completion_time'] !== 'undefined' && data[j]['fu_6mo_completion_time'] != "") {
                            ev2['Date'] = data[j]['fu_6mo_completion_time'].split(" ")[0];
                            ev2['event'] = data[j]['redcap_event_name'];
                            evs.push(ev2);
                        } else if (typeof data[j]['mypi_completion_date'] !== 'undefined' && data[j]['mypi_completion_date'] != "") {
                            ev2['Date'] = data[j]['mypi_completion_date'].split(" ")[0];
                            ev2['event'] = data[j]['redcap_event_name'];
                            evs.push(ev2);
                        } /* else if (typeof data[j]['day_one_bl_date'] !== 'undefined' && data[j]['day_one_bl_date'] !== "") {
                            ev2['Date'] = data[j]['day_one_bl_date'].split(" ")[0];
                            ev2['event'] = data[j]['redcap_event_name'];
                            ev2['order'] = i-1;
                            evs.push(ev2);
                        } */
                    }
                }
            }
            
            // add the single events
            drawCalendars( evs );
            drawShort( evs );
            drawExplanation( evs );
        });
    });
});

function drawExplanation( evs ) {
    // put the text into jQuery('#explanation')
    var t = "";
    var assent = "";
    jQuery('#explanation').text('');

    // Is this participant withdrawn?
    if (typeof pGUID !== 'undefined' && transferred.indexOf(pGUID) > -1) {
        t = t + "This participant has been transferred from another site.</br>";
    }
    if (typeof pGUID !== 'undefined' && substudy.indexOf(pGUID) > -1) {
        t = t + "This participant is part of a sub-study.</br>";
    }
    if (typeof pGUID !== 'undefined' && screenout.indexOf(pGUID) > -1) {
        t = t + "This participant has been screened out.</br>";
    }
    
    
    // now go through each event and add a sentence
    jQuery.each(evs, function(i,v) {
        if ( v['event'] == 'assent') {
            assent = v['Date'];
            var ago = moment().diff(moment(v['Date']),'days');
            t = t + "The baseline visit was about " + moment.duration(ago,'days').humanize() + " ago, on " +  moment(v['Date']).format('LL') + ".";
        }
    });

    var stop = false;
    var endDone = false;
    jQuery.each(events, function(i,v) {
        if (v['day_offset'] == 0) {
            return;
        }
        if (endDone) {
            return;
        }
        if (stop) {
            // what is the next event?
            var days = moment(assent).add(v['day_offset'],'days').diff(moment(),'days');
            var late = "";
            if (days < 0) {
                late = " was due " + Math.abs(days) + " days ago.";
            } else {
                late = " is due in " + Math.abs(days) + " days.";
            }
            t = t + " The following event is the " + v['event_name'].toLowerCase() + " event, which " + late;
            endDone = true;
            return;
        }
        // did we do this visit?
        var found = false;
        var d = "";
        var evsidx = 0;
        var expectedDate = moment(assent).add(v['day_offset'],'days');
        
        for (var i = 0; i < evs.length; i++) {
            if (evs[i]['event'] == v['unique_event_name']) {
                found = true;
                evsidx = i;
                d = evs[i]['Date'];
                break;
            }
        }
        if (found) {
            // calculate if too eary or too late
            var time = "on time";
            // compare the read date d with the expectedDate and the offset_min/max
            var daysDiff = moment(expectedDate).diff(d,'days');
            if (Math.abs(daysDiff) < v['offset_min']) {
                time = "on time";
            } else if (Math.abs(daysDiff) < 2*v['offset_min']) {
                time = "inside the exception time window (&plusmn;" + (2*v['offset_min']) + " days)";
            } else {
                var late = "days after";
                if (daysDiff < 0) {
                    late = " " + Math.abs(daysDiff) + " days after the due date";
                } else {
                    late = " " + Math.abs(daysDiff) + " days before the due date";
                }
                time = "outside the exception time window (&plusmn;" + (2*v['offset_max']) + " days)" + late;
            }
            
            t = t + " The " + v['event_name'].toLowerCase() + " visit has been done " + time + ", on " + moment(d).format('LL') + ".";
        } else {
            // look for still time?
            var late = "";
            var daysDiff = moment(expectedDate).diff(moment(),'days');
            if (daysDiff < 0) {
                late = " was " + Math.abs(daysDiff) + " days ago";
            } else {
                late = " will be in " + Math.abs(daysDiff) + " days";
            }
            
            t = t + " The " + v['event_name'].toLowerCase() + " visit has not been done. The expected date" + late + " on " + moment(expectedDate).format('LL') + ".";
        }
        // was the last event too close to the current event?
        if (found) {
            if (evsidx > 0) {
                if (moment(evs[evsidx]['Date']).diff(evs[evsidx-1]['Date'],'days') < 90) {
                    t = t + " Less than 90 days have passed between the last two events (" + evs[evsidx-1]['event'] + " and " + evs[evsidx]['event'] + ").";
                }
            }
        }
        
        // stop this loop if we are after today
        if (moment(assent).add(v['day_offset'],'days').diff(moment(),'minutes') > 0) {
            stop = true;
        }
    });

    jQuery('#explanation').append(t);
}

