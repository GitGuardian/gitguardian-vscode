export const scanResultsNoIncident =
  '{"id": "test.py", "type": "path_scan", "total_incidents": 0, "total_occurrences": 0}';

export const scanResultsWithIncident = `{
    "id":"test.py",
    "type":"path_scan",
    "entities_with_incidents":[
       {
          "mode":"FILE",
          "filename":"test.py",
          "incidents":[
             {
                "policy":"Secrets detection",
                "occurrences":[
                   {
                      "match":"DDACC73DdB04********************************************057c78317C39",
                      "type":"apikey",
                      "line_start":4,
                      "line_end":4,
                      "index_start":11,
                      "index_end":79,
                      "pre_line_start":4,
                      "pre_line_end":4
                   }
                ],
                "type":"Generic High Entropy Secret",
                "validity":"no_checker",
                "ignore_sha":"38353eb1a2aac5b24f39ed67912234d4b4a2e23976d504a88b28137ed2b9185e",
                "total_occurrences":1,
                "incident_url":"",
                "known_secret":false
             }
          ],
          "total_incidents":1,
          "total_occurrences":1
       }
    ],
    "total_incidents":1,
    "total_occurrences":1,
    "secrets_engine_version":"2.96.0"
    }`;
