
## Endpoints
- Login: GET with Username and *HASHED* password. Returns 200 & jwt on success. 
jwt is used with each subsequent request. API is responsible for handling user permissions.

jwt is placed in a cookie -> maybe. 

- List All Customer IDs: GET (Want to autofill suggestions under the search bar.)
Suggestions come from frontend. If list is too large, we can do repeated calls to the API but that gets expensive. 

- Profile: GET everything from a User Profile.

- Edit Profile: POST. Admin user changes something about a profile, API checks validity. If it is valid, updates DB and responds to this. 

- In Flask (a WSGI python library), most CORS methods require an OPTIONS methods to check if an endpoint can handle a certain HTTP method. I'm not sure if that's standard across all backends or just that implementation. Might be good practice to. 

### GET /api/login
> Sends a username, and hashed password. Returns signed JWT and User permissions
I need to be able to sign an account in, and have a trusted source return the permissions of the user. The signed JWT will be attached to every subsequent request.

### GET /api/customer/list
> Pure GET request. Returns list of customer IDs. 
For the search bar, I auto populate some suggestions based on the ID the user has typed. I'll manage the prefix tree, but this is the easiest way with under 1000 ids. 

### GET /api/customer/{ID}
> Sends a customer ID, returns the customer profile. Status, email, phone, etc.
For the searched profile, I have so much space that I need to fill. Give me as much information as we have, and we can go from there. 

### POST /api/customer/{ID}
> Admin account posts changes to the profile. 
Verify JWT permissions. Verify changes, then make the changes and post back to the DB. 

## TODO
- New Favicon
- Fix setState in useEffect hooks. Could cause unnecessary rerenders
- Move from fetch to axios
