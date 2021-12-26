# slides2gif googleapis

A simple service that handles general Google API requests.

## Routes

- `/downloadSlideImages`: Downloads Google Slide images
    - `token`: The access token
    - `presentationId`: The Google Slide presentation ID
    - `slideQuery?`: The slides to get. i.e. "1,2,3" or "3,5,9"

## Run

```
npm start
```

Create a `.env` file in this directory with contents like the other env file.
