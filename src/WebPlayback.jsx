import React, { useState, useEffect, useRef } from 'react';

const track = {
    name: "",
    album: {
        images: [{ url: "" }]
    },
    artists: [{ name: "" }]
};

function WebPlayback(props) {
    const [is_paused, setPaused] = useState(false);
    const [is_active, setActive] = useState(false);
    const [player, setPlayer] = useState(undefined);
    const [current_track, setTrack] = useState(track);
    const [mood, setMood] = useState(50); // State for mood slider
    const moodRef = useRef(mood); // Ref to keep track of the current mood

    const [activity, setActivity] = useState(50); // State for mood slider
    const activityRef = useRef(activity); 

    // Function to fetch the user's liked songs from Spotify
    const fetchLikedSongs = async () => {
        try {
            let likedSongs = [];
            const limit = 20; // Max limit per request
            let offset = 0;
            let total = 0;
    
            do {
                const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`, {
                    headers: {
                        'Authorization': `Bearer ${props.token}`
                    }
                });
    
                if (!response.ok) {
                    throw new Error('Failed to fetch liked songs');
                }
    
                const data = await response.json();
                likedSongs = likedSongs.concat(data.items);
                total = data.total;
                offset += limit;
            } while (likedSongs.length < total && likedSongs.length < 100);
    
            return likedSongs.slice(0, 100); // Return up to 100 songs
        } catch (error) {
            console.error('Error fetching liked songs:', error);
            return [];
        }
    };
    

    // Function to send the liked songs to your backend
    const sendLikedSongsToBackend = async () => {
        const likedSongs = await fetchLikedSongs();

        fetch('http://127.0.0.1:8001/receive_liked_songs', { // Replace with your actual backend endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ likedSongs })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send liked songs to backend');
            }
            // Handle the successful response here
        })
        .catch(error => {
            console.error('Error sending liked songs to backend:', error);
        });
    };

    useEffect(() => {
        moodRef.current = mood;
        activityRef.current = activity; // Update the ref whenever mood changes
    }, [mood,activity]);

    const fetchTrackUri = async (metrics) => {
        try {
            const response = await fetch('http://127.0.0.1:8001/next_track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metrics),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.trackUri; // Assuming the API returns an object with a trackUri property
        } catch (error) {
            console.error('There was a problem with your fetch operation:', error);
            return null;
        }
    }

    const playSpecificTrack = async () => {
        const currentMood = moodRef.current; // Use the current value of the mood ref
        console.log("Current Mood: ", currentMood); // Log to check the mood value

        const currentActivity = activityRef.current; // Use the current value of the mood ref
        console.log("Current Activity: ", currentActivity);

        const metrics = {
            mood: currentMood,
            weather: 'sunny', // Example
            activity: currentActivity, // Example
        };

        const trackUri = await fetchTrackUri(metrics);
        if (trackUri) {
            fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ uris: [trackUri] }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${props.token}`
                },
            }).catch(error => console.error('Error playing specific track:', error));
        }
    };

    const playNextTrack = async () => {
        const currentMood = moodRef.current; // Use the current value of the mood ref
        const currentActivity = activityRef.current;
        const metrics = {
            mood: currentMood,
            weather: 'sunny', // Example
            activity: currentActivity, // Example
        };

        const trackUri = await fetchTrackUri(metrics);
        if (trackUri) {
            fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ uris: [trackUri] }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${props.token}`
                },
            }).catch(error => console.error('Error playing specific track:', error));
        }
    };

    useEffect(() => {
        sendLikedSongsToBackend();
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: 'Web Playback SDK',
                getOAuthToken: cb => { cb(props.token); },
                volume: 0.5
            });

            setPlayer(player);

            player.addListener('ready', ({ device_id }) => {
                console.log('Ready with Device ID', device_id);
            });

            player.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
            });

            player.addListener('player_state_changed', (state => {
                if (!state) {
                    return;
                }

                setTrack(state.track_window.current_track);
                setPaused(state.paused);

                player.getCurrentState().then(state => {
                    (!state) ? setActive(false) : setActive(true)
                });

                const trackDuration = state.track_window.current_track.duration_ms;
                const position = state.position;
                const timeToEnd = trackDuration - position;

                if (timeToEnd < 30000) {
                    playSpecificTrack(mood);
                }

            }));

            player.connect();
        };
    }, []);

    if (!is_active) {
        return (
            <>
                <div className="container">
                    <div className="main-wrapper">
                        <b>Instance not active. Transfer your playback using your Spotify app</b>
                    </div>
                </div>
            </>
        );
    } else {
        return (
            <>
                <div className="container">
                    <div className="main-wrapper">
                        <h1>Appollo 🎧</h1>
                    </div>
                    <div className="slider-container">
                        <label htmlFor="mood-slider">Mood: {mood}</label>
                        <input
                            type="range"
                            id="mood-slider"
                            min="0"
                            max="100"
                            value={mood}
                            onChange={(e) => setMood(Number(e.target.value))}
                        />
                    </div>
                    <div className="slider-container">
                        <label htmlFor="activity-slider">Activity: {activity}</label>
                        <input
                            type="range"
                            id="activity-slider"
                            min="0"
                            max="100"
                            value={activity}
                            onChange={(e) => setActivity(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="container">
                    <div className="main-wrapper">
                        <img src={current_track.album.images[0].url} className="now-playing__cover" alt="" />

                        <div className="now-playing__side">
                            <div className="now-playing__name">{current_track.name}</div>
                            <div className="now-playing__artist">{current_track.artists[0].name}</div>

                            <button className="btn-spotify" onClick={() => { player.previousTrack() }}>
                                &lt;&lt;
                            </button>

                            <button className="btn-spotify" onClick={() => { player.togglePlay() }}>
                                {is_paused ? "PLAY" : "PAUSE"}
                            </button>

                            <button className="btn-spotify" onClick={playNextTrack}>
                                &gt;&gt;
                            </button>
                            <br></br>
                            
                        </div>
                    </div>
                </div>
            </>
        );
    }
}

export default WebPlayback;
