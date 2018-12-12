<?php

session_start();

include($_SERVER["DOCUMENT_ROOT"]."/code/php/AC.php");
$user_name = check_logged(); /// function checks if visitor is logged.
$admin = false;

if ($user_name == "") {
    return;
}

$permissions = list_permissions_for_user( $user_name );

$sites = [];
foreach($permissions as $perm) {
    $el = explode("Site", $perm);
    if ( count($el) == 2 && !in_array($el[1], $sites)) {
        $sites[] = $el[1];
    }
}

if (count($sites) == 0) {
    echo("[]");
    return;
}
$site = $sites[0];

$action = "getEvents";
if (isset($_GET['action'])) {
    $action = $_GET['action'];
}
$tokens = json_decode(file_get_contents('../../code/php/tokens.json'), true);

if ($action == "getEvents") {
    // request data about participants from REDCap
    $data = array(
        'token' => $tokens[$site],
        'content' => 'event',
        'format' => 'json',
        'returnFormat' => 'json'
    );
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://abcd-rc.ucsd.edu/redcap/api/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_VERBOSE, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_AUTOREFERER, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_FRESH_CONNECT, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data, '', '&'));
    $output = curl_exec($ch);
    curl_close($ch);
    echo($output);
    return;
} else if ($action == "getParticipants") {
    $participants = array();
    $participants['screenout']   = array();
    $participants['transferred'] = array();
    $participants['substudy']    = array();
    foreach ($tokens as $site => $token_key) {
        $data = array(
            'token' => $tokens[$site],
            'content' => 'record',
            'format' => 'json',
            'type' => 'flat',
            'fields' => array('id_redcap', 'enroll_total', 'track_follow_up_cat', 'base_out_reason', 'transfer_site_yn', 'fits_ss_import_error'),
            //'events' => array('baseline_year_1_arm_1'),
            'rawOrLabel' => 'raw',
            'rawOrLabelHeaders' => 'raw',
            'exportCheckboxLabel' => 'false',
            'exportSurveyFields' => 'false',
            'exportDataAccessGroups' => 'false',
            'returnFormat' => 'json'
        );
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://abcd-rc.ucsd.edu/redcap/api/');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_AUTOREFERER, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_FRESH_CONNECT, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data, '', '&'));
        $output = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($output, true);
        $parts = array();
        for( $i = 0; $i < count($data); $i++) {
            if (isset($data[$i]['enroll_total___1']) && $data[$i]['enroll_total___1'] == "1") {
                $parts[$data[$i]['id_redcap']] = 1;
            }
            if ( $data[$i]['base_out_reason'] == "4" || $data[$i]['track_follow_up_cat'] == "4") {
                if (!in_array($data[$i]['id_redcap'],$participants['screenout'])) {
                    $participants['screenout'][] = $data[$i]['id_redcap'];
                }
            }
            if ( $data[$i]['transfer_site_yn'] == "1")  {
                if (!in_array($data[$i]['id_redcap'],$participants['transferred'])) {
                    $participants['transferred'][] = $data[$i]['id_redcap'];
                }
            }
            if ( $data[$i]['fits_ss_import_error'] != "" ) {
                if (!in_array($data[$i]['id_redcap'],$participants['substudy'])) {
                    $participants['substudy'][] = $data[$i]['id_redcap'];
                }
            }
        }
        $participants[$site] = array_keys($parts);
    }
    echo(json_encode($participants));
    return;    
} else if ($action === "getData") {
    $part = "";
    if (!isset($_GET['participant'])) {
        echo("{ \"message\": \"Error, no participant provided\" }");
        return;
    }
    $part = $_GET['participant'];
    if (!isset($_GET['site'])) {
        if ($site == "") {
            echo("{ \"message\": \"Error, no site specified\" }");
            return;
        } 
        // use the site already specified
    } else { // if the site is provided use it
        $site = $_GET['site'];
    }
    //syslog(LOG_EMERG, "token is: ".$site." ".$tokens[$site]);
    $data = array(
        'token' => $tokens[$site],
        'content' => 'record',
        'format' => 'json',
        'type' => 'flat',
        'fields' => array('id_redcap', 'asnt_timestamp', 'fu_6mo_completion_time', 'mypi_completion_date'),
        'records' => array($part),
        'rawOrLabel' => 'raw',
        'rawOrLabelHeaders' => 'raw',
        'exportCheckboxLabel' => 'false',
        'exportSurveyFields' => 'false',
        'exportDataAccessGroups' => 'false',
        'returnFormat' => 'json'
    );
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://abcd-rc.ucsd.edu/redcap/api/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_VERBOSE, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_AUTOREFERER, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_FRESH_CONNECT, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data, '', '&'));
    $output = curl_exec($ch);
    curl_close($ch);
    echo($output);
    return;
} else if ($action === "getSiteData") {
    $site = "";
    if (!isset($_GET['site'])) {
        echo("{ \"message\": \"Error, no site specified\" }");
        return;
    }
    $site = $_GET['site'];
    
    $data = array(
        'token' => $tokens[$site],
        'content' => 'record',
        'format' => 'json',
        'type' => 'flat',
        'fields' => array('id_redcap', 'asnt_timestamp', 'fu_6mo_completion_time', 'mypi_completion_date', 'day_one_bl_date'),
        'rawOrLabel' => 'raw',
        'rawOrLabelHeaders' => 'raw',
        'exportCheckboxLabel' => 'false',
        'exportSurveyFields' => 'false',
        'exportDataAccessGroups' => 'false',
        'returnFormat' => 'json'
    );
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://abcd-rc.ucsd.edu/redcap/api/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_VERBOSE, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_AUTOREFERER, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_FRESH_CONNECT, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data, '', '&'));
    $output = curl_exec($ch);
    curl_close($ch);
    echo($output);
    return;
}

?>
