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
$site = "";
foreach ($permissions as $per) {
    $a = explode("Site", $per); // permissions should be structured as "Site<site name>"

    if (count($a) > 1) {
        //echo(json_encode($a) . "Count: " . count($a));
        $site = $a[1];
        break;
    }
}
if ($site == "") {
    echo (json_encode ( array( "message" => "Error: no site assigned to this user" ) ) );
    return;
}
// if site is not specified, use the first site
$siteArgument = filter_input(INPUT_GET,"site",FILTER_SANITIZE_STRING);
if ($siteArgument === "") {
    $siteArgument = $site;
}
if ($siteArgument !== "") {
    echo('<script type="text/javascript"> site = "'.$siteArgument.'"; </script>'."\n");
}
$pGUID = filter_input(INPUT_GET,"pGUID",FILTER_SANITIZE_STRING);
if ($pGUID != "") {
    echo('<script type="text/javascript"> pGUID = "'.$pGUID.'"; </script>'."\n");    
}

?>

    <title>Visit Structure</title>
    
    <!-- Bootstrap core CSS -->
    <link href="css/bootstrap.min.css" rel="stylesheet">
    
    <link href="css/select2.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
  </head>
  
  <body>
    
    <!-- Fixed navbar -->
    <nav class="navbar navbar-toggleable-md navbar-inverse fixed-top bg-inverse">
      <button class="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarCollapse" aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
	<span class="navbar-toggler-icon"></span>
      </button>
      <a class="navbar-brand" href="#">ABCD Visit Structure</a>
      <div class="collapse navbar-collapse" id="navbarCollapse">
	<ul class="navbar-nav mr-auto">
	  <li class="nav-item">
	    <a class="nav-link" href="https://abcd-report.ucsd.edu" title="Back to abcd-report page">Home</a>
	  </li>
	  <li class="nav-item">
	    <a class="nav-link" href="https://abcd-report.ucsd.edu/applications/visit-structure/index-story.php" title="Visit structure story mode, overview by sites">Story Mode</a>
	  </li>
	</ul>
      </div>
    </nav>
    
    <!-- Begin page content -->
    <div class="container-fluid" style="margin-top: 80px;">
      <div class="row">
        <div class="col-md-12">
          <div class="text-muted" style="line-height: 1.1em;">
            <p>The ABCD visit structure for a participant depends on his/her baseline visit date and is based on three types of visits. Every two years an imaging session is done. Every other year an in-person visit without imaging session is done. Every 6 month a short phone interview is performed.</p>
            <p>The colors in the detailed view indicate the periods in which the visits should be scheduled. The dark-red colored single squares indicate the actual visit days and in lighter red the current day (T - today).</p>
            <p>REDCap variables used to create this plot are <i>asnt_timestamp</i>, <i>fu_6mo_completion_time</i>, <i>mypi_completion_date</i>, and <i>day_one_bl_date</i>.</p>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <select id="participants"></select>
        </div>
      </div>
      <div class="row">
        <div class="col-md-12">
          <div style="margin-top: 70px; margin-bottom: 60px; position: relative; padding-left: 50px; min-height: 40px;" id="short"></div>
          <div style="margin-top: 20px;" id="graphics"><svg></svg></div>
          <div id="explanation"></div>
        </div>
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
    <script src="js/moment.min.js"></script>
    <script>window.jQuery || document.write('<script src="../../assets/js/vendor/jquery.min.js"><\/script>')</script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/tether/1.4.0/js/tether.min.js" integrity="sha384-DztdAPBWPRXSA/3eYEEUWrWCy7G5KFbe8fFjk5JAIxUYHKkDx6Qin1DkWx51bBrb" crossorigin="anonymous"></script>
      <script src="js/bootstrap.min.js"></script>
    <script src="js/select2.full.min.js"></script>
    <script src="js/app.js"></script>
  </body>
</html>

