# Capstone-project

This is the frontend of the Northstar Customer Resource Management software. 


## Endpoints
- Login: GET with Username and *HASHED* password. Returns 200 & jwt on success. 
jwt is used with each subsequent request. API is responsible for handling user permissions.

jwt is placed in a cookie -> maybe. 

- List All Customer IDs: GET (Want to autofill suggestions under the search bar.)
Suggestions come from frontend. If list is too large, we can do repeated calls to the API but that gets expensive. 

- Profile: GET everything from a User Profile.

- Edit Profile: POST. Admin user changes something about a profile, API checks validity. If it is valid, updates DB and responds to this. 

- In Flask (a WSGI python library), most CORS methods require an OPTIONS methods to check if an endpoint can handle a certain HTTP method. I'm not sure if that's standard across all backends or just that implementation. Might be good practice to. 

## TODO
- New Favicon
- 