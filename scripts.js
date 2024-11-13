const jsmediatags = window.jsmediatags;

let playlist_list = document.querySelector("#playlistlist");
let playlist_text = document.getElementById("new-playlist-text");
const new_playlist_btn = document.getElementById("new-playlist-button");

let track_art = document.querySelector(".track-art");
let track_name = document.querySelector(".track-name");
let track_artist = document.querySelector(".track-artist");
let prev_btn = document.querySelector(".prev-track");
let playpause_btn = document.querySelector(".playpause-track");
let next_btn = document.querySelector(".next-track");
let curr_time = document.querySelector(".current-time");
let seek_slider = document.querySelector(".seek_slider");
let total_duration = document.querySelector(".total-duration");
let volume_slider = document.querySelector(".volume_slider");
let repeatIcon = document.querySelector(".repeat-track");
let shuffleIcon = document.querySelector(".shuffle-tracks");

let now_playing = document.querySelector(".now-playing");
let music_list = document.querySelector("#songlist");
const add_btn = document.getElementById("open-file-button");

let seek;
let volume = 50;
let curr;
let total;

let files = [];
let nonShuffledFiles;
let filePaths = [];
let playlist_names = [];
let playlist_name;
let darkmode = false;
document.body.dataset.theme = "light";
let shuffled = false;
let shuffleWeight = [];
let allShuffled = 0;

let storage = [];
let track_list = [];
let track_index = 0;
let isPlaying = false;
let updateTimer;
let url = "";
let isRepeating = false;
let block = false;
let noPlaylists = true;

let curr_track = document.createElement('audio');

document.addEventListener("DOMContentLoaded", async() => 
{
  disableButtons();

  await getPlaylists();

  await loadState();
  if (darkmode)
  {
    darkmode = false;
    darkmodeToggle();
  }

  document.querySelector(".left-side").classList.remove("disabled");
  if(noPlaylists == false)
  {
    updatePlaylistList();
    await loadPlaylist();
    if (filePaths.length != 0)
    {
      await loadSequence();
      document.querySelector(".player").classList.remove("disabled");
    }
    document.querySelector(".right-side").classList.remove("disabled");
  }

  if (isRepeating)
  {
    isRepeating = false;
    repeatTrack();
  }

  volume_slider.value = volume;
  volume_slider.textContent = volume;
  setVolume();
});

async function loadSequence()
{
  await loadUpFiles();
  await updateTrackList();
  updateDisplayList();
  loadTrack(track_index);
  pauseTrack();
}

async function loadPlaylist()
{
  //console.log("PL_NAME: " + playlist_name);
  if (!noPlaylists) {
    const loadPlaylist = await window.electronAPI.loadPlaylist(playlist_name);
    filePaths = loadPlaylist.filePaths || [];
    track_index = loadPlaylist.track_index || 0;

    Array.from(playlist_list.children).forEach(child => {
      if (child.textContent == playlist_name) {
        child.classList.add("selected");
      } else {
        child.classList.remove("selected");
      }
    });
  }
  shuffled = true;
  shuffleToggle();
}

async function getPlaylists()
{
  playlist_names = [];
  playlist_names = await window.electronAPI.getPlaylists();
  if (playlist_names.length == 0)
  {
    noPlaylists = true;
  }
  else
  {
    noPlaylists = false;
    playlist_name = playlist_names[0];
  }
}

async function loadState()
{
  const loadState = await window.electronAPI.loadState();
  darkmode = loadState.darkmode || false;
  isRepeating = loadState.isRepeating || false;
  volume = loadState.volume;
}

function updateState()
{
  const state = 
  {
    darkmode,
    isRepeating,
    volume,
  };
  window.electronAPI.backupState(state);
}

function updatePlaylist()
{
  const playlist = 
  {
    filePaths,
    track_index,
  };
  window.electronAPI.backupPlaylist(playlist, playlist_name);
}

new_playlist_btn.addEventListener("click", async () => {
  if (playlist_text.value != "" && !playlist_names.includes(playlist_text.value, 0)) {
    disableButtons();
    let temp = playlist_text.value;
    playlist_name = playlist_text.value;
    resetPlayer();
    updateState();
    updatePlaylist();
    
    await getPlaylists();
    updatePlaylistList();
    playlist_name = temp;
    loadPlaylist();
    document.querySelector(".left-side").classList.remove("disabled");
    document.querySelector(".right-side").classList.remove("disabled");
  }
});

add_btn.addEventListener("click", async () => {
  disableButtons();
  const tempfilePaths = await window.electronAPI.openFileDialog();
  if (tempfilePaths.length != 0)
  {
    for (temp of tempfilePaths)
      {
        filePaths.push(temp);
      }
      
      await loadSequence();
      updateState();
      updatePlaylist();
  }
  if (filePaths.length != 0) {
    enableButtons();
  } else {
    document.querySelector(".left-side").classList.remove("disabled");
    document.querySelector(".right-side").classList.remove("disabled");
  }
});

async function loadUpFiles() {
  files = [];
  block = false;
  try {
    const fileBuffers = await window.electronAPI.filePathToFile(filePaths);
    let i = 0;
    for (const fileBuffer of fileBuffers) 
    {
      const blob = new Blob([fileBuffer], {type: 'audio/mpeg'});
      const fileName = filePaths[i].split('\\').pop();
      const file = new File([blob], fileName, {type: 'audio/mpeg'});
      files.push(file);
      i++;
    }
    nonShuffledFiles = [...files];
    //console.log('LOAD UP COMPLETE!');
    playlist_list.style.display = "block";
    /////////////////////
  }
  catch (error) {
    console.error('Error with loadUpFiles: ', error);
    resetPlayer();
    updatePlaylist();
    loadPlaylist();
    document.querySelector(".left-side").classList.remove("disabled");
    document.querySelector(".right-side").classList.remove("disabled");
    block = true;
  }
}

document.querySelector("#songlist").addEventListener("click", function(e) {
  if (!e.target.dataset.url)
    return;

  track_index = parseInt(e.target.dataset.url);
  loadTrack(track_index);
  playTrack();
  updateState();
});

document.querySelector("#playlistlist").addEventListener("click", async function(e) {
  //console.log("playlist target: ",e.target.dataset.url);
  if (!e.target.dataset.url)
    return;
  
  if (e.target.dataset.url != playlist_name) 
  {
    disableButtons();
    playlist_name = e.target.dataset.url;

    await loadPlaylist();
    if (filePaths.length == 0) {
      resetPlayer();
      document.querySelector(".left-side").classList.remove("disabled");
      document.querySelector(".right-side").classList.remove("disabled");
      //window.reload();
    } else {
      await loadSequence();
      enableButtons();
    }
  }
});

async function updateTrackList() { 
  storage = [];
  track_list = [];
  for (const file of files) 
    {
    await new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          addTrack(getTitle(tag, file.name), getArtist(tag), getPicture(tag));
          storage.push(file);
          resolve();
        },
        onError: (error) => {
          console.error(error);
          resolve();
        },
      });
    });
  }
}

function updateDisplayList() {
  if (!block) {
    music_list.style.display = "block";
    block = true;
  }
  music_list.innerHTML = "";
  for (let i = 0; i < track_list.length; i++) {
    let li = document.createElement("li");
    let spa = document.createElement("span")
    spa.appendChild(document.createTextNode(track_list[i].name));
    li.setAttribute("data-url", i);
    spa.setAttribute("data-url", i);
    li.appendChild(spa);
    music_list.appendChild(li);
  }
}

async function updatePlaylistList() {
  if (playlist_names.length == 0) {
    playlist_list.style.display = "none";
  } else {
    playlist_list.style.display = "block";
  }
  playlist_list.innerHTML = "";
  const playlistNames = await window.electronAPI.getPlaylists();
  if (playlistNames.length != 0) {
    for(let i = 0; i < playlistNames.length; i++) {
      let li = document.createElement("li");
      let spa = document.createElement("span")
      spa.appendChild(document.createTextNode(playlistNames[i]));
      li.setAttribute("data-url", playlistNames[i]);
      spa.setAttribute("data-url", playlistNames[i]);
      li.appendChild(spa);
      playlist_list.appendChild(li);
    }
  }
}

function disableButtons() {
  document.querySelector(".left-side").classList.add("disabled");
  document.querySelector(".player").classList.add("disabled");
  document.querySelector(".right-side").classList.add("disabled");
}

function enableButtons() {
  document.querySelector(".left-side").classList.remove("disabled");
  document.querySelector(".player").classList.remove("disabled");
  document.querySelector(".right-side").classList.remove("disabled");
}

function getTitle(tag, name) {
  if (tag.tags.title) {
    return tag.tags.title;
  } else {
    let split = name.split('.');
    split.pop();
    return split;
  }
}

function getArtist(tag) {
  if (tag.tags.artist) {
    return tag.tags.artist;
  } else {
    return "Ismeretlen előadó";
  }
}

function getPicture(tag) {
  if (tag.tags.picture) {
    const data = tag.tags.picture.data;
    const format = tag.tags.picture.format;
    let base64String = "";
    for(let i = 0; i < data.length; i++)
    {
      base64String += String.fromCharCode(data[i]);
    }
    return `url(data:${format};base64,${window.btoa(base64String)})`;
  } else {
    return `url("vinyl.gif")`;
  }
}

function addTrack(name, artist, image) {
  track_list.push({
    name: name,
    artist: artist,
    image: image
  });
}

music_list.addEventListener('contextmenu', removeTrack);

async function removeTrack(event) {
  //console.log("target: " + event.target.getAttribute('data-url'));
  //console.log("tindex: " + track_index)
  let target = event.target.getAttribute('data-url');

  //console.log("Remove target: ",target);
  if (!target)
    {
      enableButtons();
      return;
    }
  disableButtons();


  filePaths.splice(target, 1);
  files.splice(target, 1);
  track_list.splice(target, 1);
  storage.splice(target, 1);
  //console.log(files);
  if (shuffleWeight.length == (files.length + 1)) {
    shuffleWeight.splice(target, 1);
  }

  updateState();
  updateDisplayList();
  updatePlaylist();

  if (track_list.length == 0) {
    resetPlayer();
    document.querySelector(".left-side").classList.remove("disabled");
    document.querySelector(".right-side").classList.remove("disabled");
    //location.reload();
  } else {
    if (target == track_index) {
      //console.log("INDEX: " + track_index);
      //console.log("LISTLENGTH: " + track_list.length);
      track_index = (track_index == track_list.length) ? 0 : track_index;
      loadTrack(track_index);
    } else if (target < track_index) {
      track_index -= 1;
    }
    now_playing.textContent = (track_index + 1) + "/" + track_list.length;
    music_list.children[track_index].classList.add("selected");

    if (isPlaying) {
      playTrack();
    }

    enableButtons();
  }
}

function loadTrack(track_index) {
  clearInterval(updateTimer);

  resetValues();
  random_bg_color();
  
  if (url) URL.revokeObjectURL(url);
  
  url = URL.createObjectURL(storage[track_index]);
  curr_track.src = url;
  curr_track.load();

  if (music_list.querySelector(".selected") != null) {
    music_list.querySelector(".selected").classList.remove("selected");
  }
  music_list.children[track_index].classList.add("selected");
  
  track_art.style.backgroundImage = track_list[track_index].image;
  track_name.textContent = track_list[track_index].name;
  track_artist.textContent = track_list[track_index].artist;
  now_playing.textContent = (track_index + 1) + "/" + track_list.length;
  
  updateTimer = setInterval(seekUpdate, 1000);
  curr_track.addEventListener("ended", nextTrack);
  
  updatePlaylist();
}
   
function random_bg_color() {
  let red = Math.floor(Math.random() * 256) + 64;
  let green = Math.floor(Math.random() * 256) + 64;
  let blue = Math.floor(Math.random() * 256) + 64;

  let bgColor;
  if (darkmode) {
    bgColor = "rgb(" + red/3 + ", " + green/3 + ", " + blue/3 + ")";
  } else {
    bgColor = "rgb(" + red + ", " + green + ", " + blue + ")";
  }

  document.body.style.background = bgColor;
  document.querySelector('.darkmode_icon').style.setProperty('--cover-color', bgColor);
  document.querySelector('#open-file-button').style.setProperty('--cover-color', bgColor);
  document.querySelector('#new-playlist-button').style.setProperty('--cover-color', bgColor);
}

document.querySelector("#darkmode").addEventListener("click", darkmodeToggle);

function darkmodeToggle() {
  if (darkmode)
  {
    darkmode = false;
    document.body.dataset.theme = "light";
    random_bg_color();
    lightMode();
  }
  else
  {
    darkmode = true;
    document.body.dataset.theme = "dark";
    random_bg_color();
    darkMode();
  }
}

function lightMode() {
  const listItems = document.querySelectorAll(".list ol li");
  for (item of listItems)
  {
    item.style.color = "rgba(0,0,0,0.8)";
  }
  document.querySelector(".track-name").style.color = "rgba(0,0,0,0.8)";
  document.querySelector(".track-artist").style.color = "rgba(0,0,0,0.8)";
  document.querySelector(".now-playing").style.color = "rgba(0,0,0,0.8)";
  document.querySelector(".current-time").style.color = "rgba(0,0,0,0.8)";
  document.querySelector(".total-duration").style.color = "rgba(0,0,0,0.8)";
}

function darkMode() {
  const listItems = document.querySelectorAll(".list ol li");
  for (item of listItems)
  {
    item.style.color = "rgba(230,230,230,0.8)";
  }
  document.querySelector(".track-name").style.color = "rgba(230,230,230,0.8)";
  document.querySelector(".track-artist").style.color = "rgba(230,230,230,0.8)";
  document.querySelector(".now-playing").style.color = "rgba(230,230,230,0.8)";
  document.querySelector(".current-time").style.color = "rgba(230,230,230,0.8)";
  document.querySelector(".total-duration").style.color = "rgba(230,230,230,0.8)";
}

function resetValues() {
  curr_time.textContent = "00:00";
  total_duration.textContent = "00:00";
  seek_slider.value = 0;
}

function resetPlayer() {
  pauseTrack();
  curr_track.src = "";
  now_playing.textContent = "0/0";
  track_art.style.backgroundImage = "url('./cat.gif')";
  track_name.textContent = "Zeneszám címe";
  track_artist.textContent = "Előadó neve";
  curr_time.textContent = "00:00";
  total_duration.textContent = "00:00";
  seek_slider.value = 0;
  filePaths = [];
  storage = [];
  track_list = [];
  track_index = 0;
  block = false;
  playlist_text.value = "";
  music_list.style.display = "none";
  music_list.innerHTML = "";
}

document.querySelector(".playpause-track").addEventListener("click", playpauseTrack);

function playpauseTrack() {
  if (!isPlaying) playTrack();
  else pauseTrack();
}
    
function playTrack() {
  //console.log("TRACK_INDEX: ", track_index);
  curr_track.play();
  isPlaying = true;
  playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>';

  updateState();
}

function pauseTrack() {
  curr_track.pause();
  isPlaying = false;
  playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';

  updateState();
}

document.querySelector(".next-track").addEventListener("click", nextTrack);

function nextTrack() {
  if (!isRepeating) 
  {
    if (shuffled)
    {
      //console.log("files.length: ", files.length);
      //console.log("shuffleWeight.length: ", shuffleWeight.length);
      
      if (allShuffled < shuffleWeight.length)
      {
        allShuffled += 1;
        //console.log("allShuffled: ", allShuffled);
      }
      else
      {
        shuffleWeight = new Array(files.length).fill(false);
        allShuffled = 1;
      }
      const randomNext = getRandomNext();
      track_index = randomNext;
      shuffleWeight[track_index] = true;
      //console.log(shuffleWeight);
    }
    else
    {
      if (track_index < track_list.length - 1)
        track_index += 1;
      else 
        track_index = 0;
    }

    
    loadTrack(track_index);
    playTrack();
  }
  else 
  {
    curr_track.currentTime = 0;
    playTrack();
  }
}

function getRandomNext()
{
  let randomNext = Math.floor(Math.random() * shuffleWeight.length);
  while (shuffleWeight[randomNext] != false)
  {
    randomNext = Math.floor(Math.random() * shuffleWeight.length);
    //console.log("randomNext: ", randomNext)
  }
  return randomNext;
}

document.querySelector(".prev-track").addEventListener("click", prevTrack);

function prevTrack() {
  if (!isRepeating) {
    if (track_index > 0)
      track_index -= 1;
    else 
      track_index = track_list.length - 1;

    loadTrack(track_index);
    playTrack();
  } 
  else 
  {
    curr_track.currentTime = 0;
    playTrack();
  }

  if(shuffled && shuffleWeight[track_index] == false)
  {
      shuffleWeight[track_index] = true;
      allShuffled += 1;
  }
}

document.querySelector(".repeat-track").addEventListener("click", repeatTrack);

function repeatTrack() {
  if (!isRepeating) {
    isRepeating = true;
    repeatIcon.innerHTML = '<img style="padding-top: 25px; padding-right: 15px; width: 32px; height: 32px;" src="./Repeat.png" alt="Ismétlés">'
  } else {
    isRepeating = false;
    repeatIcon.innerHTML = '<img style="padding-top: 25px; padding-right: 15px; width: 32px; height: 32px;" src="./NoRepeat.png" alt="Ismétlés">'
  }
  updateState();
}

document.querySelector(".shuffle-tracks").addEventListener("click", shuffleToggle);

function shuffleToggle() {
  if (!shuffled) {
    shuffled = true;

    shuffleWeight = new Array(files.length).fill(false);
    shuffleWeight[track_index] = true;
    allShuffled += 1;

    shuffleIcon.innerHTML = '<img style="padding-top: 25px; padding-left: 15px; width: 32px; height: 32px;" src="./Shuffle.png" alt="Véletlen sorrend">'
  } else {
    shuffled = false;
    shuffleIcon.innerHTML = '<img style="padding-top: 25px; padding-left: 15px; width: 32px; height: 32px;" src="./NoShuffle.png" alt="Véletlen sorrend">'
  }
  //console.log("shuffled?: ", shuffled);
  //shuffleTracks();
}

document.querySelector(".seek_slider").addEventListener("input", seekTo);

function seekTo() {
  let seekto = curr_track.duration * (seek_slider.value / 100);
  curr_track.currentTime = seekto;
}
   
document.querySelector(".volume_slider").addEventListener("input", setVolume);

function setVolume() {
  curr_track.volume = volume_slider.value / 100;

  volume = volume_slider.value;
  updateState();
}
   
function seekUpdate() {
  let seekPosition = 0;
  
  if (!isNaN(curr_track.duration)) {
    seekPosition = curr_track.currentTime * (100 / curr_track.duration);
    seek_slider.value = seekPosition;
  
    let currentMinutes = Math.floor(curr_track.currentTime / 60);
    let currentSeconds = Math.floor(curr_track.currentTime - currentMinutes * 60);
    let durationMinutes = Math.floor(curr_track.duration / 60);
    let durationSeconds = Math.floor(curr_track.duration - durationMinutes * 60);
  
    if (currentSeconds < 10) { currentSeconds = "0" + currentSeconds; }
    if (durationSeconds < 10) { durationSeconds = "0" + durationSeconds; }
    if (currentMinutes < 10) { currentMinutes = "0" + currentMinutes; }
    if (durationMinutes < 10) { durationMinutes = "0" + durationMinutes; }
  
    curr_time.textContent = currentMinutes + ":" + currentSeconds;
    total_duration.textContent = durationMinutes + ":" + durationSeconds;
  }
}