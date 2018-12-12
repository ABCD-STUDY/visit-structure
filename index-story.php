<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="">
    <link rel="icon" href="../../favicon.ico">
    

<?php
session_start();

include($_SERVER["DOCUMENT_ROOT"]."/code/php/AC.php");
$user_name = check_logged(); /// function checks if visitor is logged.
$admin = false;

if ($user_name == "") {
    // user is not logged in
    return;
} else {
    if ($user_name == "admin") {
        $admin = true;
    }
    echo('<script type="text/javascript"> user_name = "'.$user_name.'"; </script>'."\n");
    echo('<script type="text/javascript"> admin = '.($admin?"true":"false").'; </script>'."\n");
}

$permissions = list_permissions_for_user( $user_name );
$can_remove_issues = false;
if (in_array("can-remove-issues", $permissions)) {
    $can_remove_issues = true;
}
echo('<script type="text/javascript"> can_remove_issues = "'.($can_remove_issues?"1":"0").'"; </script>'."\n");
//echo (json_encode($permissions));
// find the first permission that corresponds to a site
// Assumption here is that a user can only add assessment for the first site he has permissions for!
$site = array();
foreach ($permissions as $per) {
    $a = explode("Site", $per); // permissions should be structured as "Site<site name>"

    if (count($a) > 1) {
        //echo(json_encode($a) . "Count: " . count($a));
	if($a[1] != "MSSM"){
            $site[] = $a[1];
	}
    }
}
if (count($site) == 0) {
    echo (json_encode ( array( "message" => "Error: no site assigned to this user" ) ) );
    return;
}

$tokens = json_decode(file_get_contents("/var/www/html/code/php/tokens.json"), true);

echo('<script type="text/javascript">var site_list = '.json_encode(array_keys($tokens)).'; </script>'."\n");
echo('<script type="text/javascript">var sites = '.json_encode($site).'; </script>'."\n");
?>

    <title>Visit Structure - Story Mode</title>
    
    <!-- Bootstrap core CSS -->
    <link href="css/bootstrap.min.css" rel="stylesheet">
    
    <!-- <link href="css/style.css" rel="stylesheet"> -->
    <style>

     text {
       font-family: "ProximaNova",Helvetica,Arial,sans-serif;
       font-size: 12px;
       color: gray;
     }
     text.eventname {
       font-family: "ProximaNova",Helvetica,Arial,sans-serif;
       font-style: italic;
       fill: lightgray;
       font-size: 9px;
     }
     
     text.quantitativeEvent {
       font-family: "ProximaNova",Helvetica,Arial,sans-serif;
       font-style: normal;
       fill: gray;
       font-size: 12px;
     }
     
     rect {
       fill: white;
       fill-opacity: 0.3;
       stroke: gray;
       stroke-opacity: 0.3;
     }
     rect.light {
       fill: #3c6da8;
       stroke: #3c6da8;
     }
     rect.dark {
       fill: #df2929;;
       stroke: #df2929;
       stroke-opacity: 1;
     }
     rect.black {
       fill: #000;
       stroke: #000;
       stroke-opacity: 1;
     }
     rect.grey {
       fill:  #DAA520;
       stroke:  #DAA520;
       stroke-opacity: 1;
     }
     rect.yellow {
       fill:  #00A520;
       stroke:  #00A520;
       stroke-opacity: 1;
     }
     path {
       fill: none;
       stroke-width: 2;
       stroke: #333;
     }
     circle.appearance {
       fill: gray;
       stroke: none;
     }
     
     path.light {
       stroke: #3c6da8;
       stroke-opacity: 0.5;
     }
     
     path.dark {
       stroke: #df2929;
     }
     path.black {
       stroke: #000;
     }
     path.grey {
       stroke:  #DAA520;
     }
     path.yellow {
       stroke:  #00A520;
     }
     
     .intro text:first-child {
       fill: #fff;
       stroke: #f9f9f9;
       stroke-width: 3;
     }
     
     .intro text+text {
       fill: #333;
     }
     
     .intro text+text.dark {
       fill: #df2929;
     }
     .intro text+text.black {
       fill: #000;
     }
     .intro text+text.grey {
       fill: #DAA520;
     }
     .intro text+text.yellow {
       fill: #00A520;
     }
     
     .intro text+text.light {
       fill: #3c6da8;
     }
     .site {
       //display: inline-flex;
       margin: 5px;
       border: 1px solid lightgrey;
       border-radius: 3px;
       padding: 5px;
     }
     text.tinytext {
       font-size: 7pt;
       text-anchor: left;
       fill: #3c6da8;
     }
     .perc-text {
       font-size: 9pt;
     }
    </style>
  </head>
  
  <body>
    
    <!-- Fixed navbar -->
    <nav class="navbar navbar-toggleable-md navbar-inverse fixed-top bg-inverse">
      <button class="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarCollapse" aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
	<span class="navbar-toggler-icon"></span>
      </button>
      <a class="navbar-brand" href="#">ABCD Visit Structure Story Mode</a>
      <div class="collapse navbar-collapse" id="navbarCollapse">
	<ul class="navbar-nav mr-auto">
	  <li class="nav-item">
	    <a class="nav-link" href="https://abcd-report.ucsd.edu" title="Back to abcd-report page">Home</a>
	  </li>
	</ul>
      </div>
    </nav>
    
    <!-- Begin page content -->
    <div class="container-fluid" style="margin-top: 80px;">
      <div class="row">
        <div class="col-md-12">
          <div class="text-muted" style="line-height: 1.2em;">
            <p>Story mode shows existing data for participants with missed visits (red) over time. Each vertical bar represents an event, with the first bar representing the baseline event. By displaying existing events (based on <i>asnt_timestamp</i>, <i>fu_6mo_completion_time</i>, and <i>mypi_completion_date</i>) for these participants it becomes apparent which visits have been missed. A participant with complete visits (blue) is shown for comparison. Participants in black have been withdrawn and have missed visits. If the participant is drawn in yellow it has been transferred from another site and has missing visits. Transferred and withdrawn participants do not count towards the site's percentage of participants with missed visits. Additionally, participants that are enrolled in sub-studies like the Fitbit sub-study are shown in green.</p>
          </div>
          <div style="margin-bottom: 15px; margin-left: 10px;"><center id="treemap"></center></div>
          <div style="margin-bottom: 15px; margin-left: 10px;"><center id="treemap2"></center></div>
          <div id="content" style=""></div>
        </div>
      </div>
      <div class="progress" id="progress-report">
        <div class="progress-bar progress-bar-striped bg-info progress-bar-animated" role="progressbar" style="width: 50%" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>
      
    <footer class="footer">
      <div class="container-fluid">
        <hr>
        <div style="margin-bottom: 20px;"><i>A service provided by the Data Analysis and Informatics Core of ABCD</i></div>
      </div>
    </footer>
    
    
    <!-- Bootstrap core JavaScript
         ================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <script   src="js/jquery-3.1.1.min.js"></script>
    <script   src="js/d3.v3.min.js"></script>
    <script   src="js/narrative.js"></script>
    <script   src="js/moment.min.js"></script>
    <script>window.jQuery || document.write('<script src="../../assets/js/vendor/jquery.min.js"><\/script>')</script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/tether/1.4.0/js/tether.min.js" integrity="sha384-DztdAPBWPRXSA/3eYEEUWrWCy7G5KFbe8fFjk5JAIxUYHKkDx6Qin1DkWx51bBrb" crossorigin="anonymous"></script>
      <script src="js/bootstrap.min.js"></script>
    <script src="js/app-story.js"></script>
  </body>
</html>

