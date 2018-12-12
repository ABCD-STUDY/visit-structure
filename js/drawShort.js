
function drawShort( data, where ) {
    // #visit_structure
    jQuery(where).children().remove();
    var assent = null;
    for (var i = 0; i < data.length; i++) {
        if (data[i]['event'] == 'assent') {
            assent = moment(data[0]['Date'], "YYYY-MM-DD"); //moment(data, "YYYY-MM-DD hh:mm:ss");
            break;
        }
    }
    console.log("got assent: " + assent);
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
            jQuery(where).append("<div class='eventbox " + col + "' title='" + events[i]['event_name'] + "'></div>");
            if (col != "unknown") {
                jQuery(where).append("<div class='to' title='Expected date " + events[i]['unique_event_name'] + "'>" + moment(assent).add(events[i]['day_offset'], 'day').format("MM/DD/YYYY") + "</div>");
            } else {
                var startDate = moment(assent).add(events[i]['day_offset']-events[i]['offset_min'], 'day');
                var endDate   = moment(assent).add(events[i]['day_offset']+events[i]['offset_max'], 'day');
                jQuery(where).append("<div class='startDateU'>" + startDate.format("MM/DD") + "</div>");
                jQuery(where).append("<div class='endDateU'>" + endDate.format("MM/DD") + "</div>");
                jQuery(where).append("<div class='to' title='Expected date " + events[i]['unique_event_name'] + "'>" + moment(assent).add(events[i]['day_offset'], 'day').format("MM/DD/YYYY") + "</div>");
            }            
        }
        jQuery(where).append("<div class='te " + visitCol + "' title='Actual date " + events[i]['event_name'] + "'>" + eventDate + "</div>");
        jQuery(where).append("<div class='" + visitType + "'><div class='et'>" + str + "</div></div>");
        if (oneMore) {
            break;
        }
    }
    // provide space for the short visit summary
    jQuery(where).css('position','relative');
    jQuery(where).css('height', '140px');
    jQuery(where).css('top', '50px');
    jQuery(where).css('left', '50px');
}


// insert a display for the visit structure
function addVisitStructure(where, pGUID) {
    //jQuery(where).append("pguid is: " + pGUID);
    jQuery.getJSON('/applications/visit-structure/getVisitInfo.php', { 'action': 'getEvents' }, function(data) {
        if (data.length == 0) {
            console.log("no data from getVisitInfo.php");
            return;
        }

        events = data;
        // pGUID = jQuery('#participants').val();
        jQuery.getJSON('/applications/visit-structure/getVisitInfo.php', { 'action': 'getData', 'participant': pGUID }, function(data) {
            if (data.length == 0) {
                console.log("no data from getVisitInfo.php");
                return;
            }
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
                // give up
                return;
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
                        }
                    }
                }
            }
            // add the single events
            drawShort( evs, where );
        });
    });
}
