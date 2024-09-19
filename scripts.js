const jsmediatags = window.jsmediatags;

let now_playing = document.querySelector(".now-playing");
let track_art = document.querySelector(".track-art");
let track_name = document.querySelector(".track-name");
let track_artist = document.querySelector(".track-artist");

let now_playlist = document.getElementById("now-playlist");  
let playlist_text = document.getElementById("playlist-text");

let playpause_btn = document.querySelector(".playpause-track");
let next_btn = document.querySelector(".next-track");
let prev_btn = document.querySelector(".prev-track");
const add_btn = document.getElementById('open-file-button');
const new_playlist_btn = document.getElementById('new-playlist-button');
//const remove_btn = document.getElementById('remove-track-button');

let seek_slider = document.querySelector(".seek_slider");
let seek;
let volume_slider = document.querySelector(".volume_slider");
let volume = 50;
let curr_time = document.querySelector(".current-time");
let curr;
let total_duration = document.querySelector(".total-duration");
let total;

let files = [];
let nonShuffledFiles;
let filePaths = [];
let playlist_names = [];
let playlist_name = "|-|-|";
let darkmode = false;
document.body.dataset.theme = "light";
let shuffled = false;
let shuffleWeight = [];

let storage = [];
let track_list = [];
let track_index = 0;
let isPlaying = false;
let updateTimer;
let url = "";
let isRepeating = false;
let block = false;
let noPlaylists = false;

let music_list = document.querySelector("#songlist");
music_list.addEventListener('contextmenu', removeTrack);
let playlist_list = document.querySelector("#playlistlist");
let repeatIcon = document.querySelector(".repeat-track");
let shuffleIcon = document.querySelector(".shuffle-tracks");

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

    if(!noPlaylists)
    {
      await loadPlaylist();
      updatePlaylistList();

      if (filePaths.length != 0)
      {
        await loadSequence();
      } 
      else 
      {
        document.querySelector('.darkmode_icon').style.setProperty('--cover-color', 'lightgreen');
        //document.querySelector('#remove-track-button').style.setProperty('--cover-color', 'lightgreen');
        document.querySelector('#open-file-button').style.setProperty('--cover-color', 'lightgreen');
      }
      enableButtons();
    }
    else
    {
      playlist_text.disabled = false;
      new_playlist_btn.disabled = false;
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
  if (playlist_name!="|-|-|")
  {
    const loadPlaylist = await window.electronAPI.loadPlaylist(playlist_name);
    filePaths = loadPlaylist.filePaths || [];
    track_index = loadPlaylist.track_index || 0;
    //now_playlist.textContent = playlist_name;
  }
}

async function getPlaylists()
{
  playlist_names = await window.electronAPI.getPlaylists();
  if (playlist_names.length == 0)
  {
    playlist_name = "|-|-|";
    noPlaylists = true;
  }
  else
    playlist_name = playlist_names[0];
  
  console.log(playlist_names);
}

async function loadState()
{
  const loadState = await window.electronAPI.loadState();
  darkmode = loadState.darkmode || false;
  isPlaying = loadState.isPlaying || false;
  isRepeating = loadState.isRepeating || false;
  volume = loadState.volume;
}

function updateState()
{
  const state = 
  {
    darkmode,
    isPlaying,
    isRepeating,
    volume,
  };
  window.electronAPI.backupState(state);

  const playlist = 
  {
    filePaths,
    track_index,
  };
  window.electronAPI.backupPlaylist(playlist, playlist_name);
}

add_btn.addEventListener('click', async () => 
  {
    disableButtons();
    const tempfilePaths = await window.electronAPI.openFileDialog();
    console.log(tempfilePaths);
    if (tempfilePaths.length!=0)
    {
      for (temp of tempfilePaths)
        {
          filePaths.push(temp);
        }
        //console.log('File Paths: ',filePaths);
        
        await loadSequence();
        updateState();
    }
    enableButtons(); 
  });

new_playlist_btn.addEventListener('click', async () => 
{
  if (playlist_text.value != "")
  {
    disableButtons();
    playlist_name = playlist_text.value;
    console.log(playlist_text.value);
    updateState();
    noPlaylists=false;
    updatePlaylistList();
    enableButtons();
  }
});

async function loadUpFiles()
{
  files = [];
  try
  {
    const fileBuffers = await window.electronAPI.filePathToFile(filePaths);
    let i = 0;
    for (const fileBuffer of fileBuffers) 
    {
      const blob = new Blob([fileBuffer], {type: 'audio/mpeg'});
      const fileName = filePaths[i].split('\\').pop();
      const file = new File([blob], fileName, {type: 'audio/mpeg'});
      //console.log(file);
      files.push(file);
      i++;
    }
    nonShuffledFiles = [...files];
    console.log('LOAD UP COMPLETE!');
    playlist_list.style.display = "block";
    /////////////////////
  }
  catch (error) {console.error('Error with loadUpFiles: ', error);}
}

document.querySelector("#songlist").addEventListener("click", function(e) {
  track_index = parseInt(e.target.dataset.url);
  loadTrack(track_index);
  playTrack();
  updateState();
});

document.querySelector("#playlistlist").addEventListener("click", async function(e) 
{
  disableButtons();
  playlist_name = e.target.dataset.url;
  await loadPlaylist();
  if (filePaths.length == 0)
  {
    resetPlayer();
    //window.reload();
  }
  else
  {
    await loadSequence();
  }
  enableButtons();
});

/*remove_btn.addEventListener('click', function() 
{
  removeTrack();
});*/

async function updateTrackList() 
{ 
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

function updateDisplayList() 
{
  if (!block)
  {
    music_list.style.display = "block";
    block = true;
  }
  music_list.innerHTML = "";
  for(let i = 0; i < track_list.length; i++) {
    let li = document.createElement("li");
    let spa = document.createElement("span")
    spa.appendChild(document.createTextNode(track_list[i].name));
    li.setAttribute("data-url", i);
    spa.setAttribute("data-url", i);
    li.appendChild(spa);
    music_list.appendChild(li);
  }
}

async function updatePlaylistList()
{
  if (filePaths.length == 0) {
    playlist_list.style.display = "none";
  } else {
    playlist_list.style.display = "block";
  }
  const playlistNames = await window.electronAPI.getPlaylists();
  if (playlistNames.length == 0) {
    let li = document.createElement("li");
    let spa = document.createElement("span")
    spa.appendChild(document.createTextNode(playlist_name));
    li.setAttribute("data-url", playlist_name);
    spa.setAttribute("data-url", playlist_name);
    li.appendChild(spa);
    playlist_list.appendChild(li);
  } else {
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

function disableButtons()
{
  next_btn.disabled = true;
  prev_btn.disabled = true;
  add_btn.disabled = true;
  //remove_btn.disabled = true;
  seek_slider.disabled = true;
  volume_slider.disabled = true;

  playlist_text.disabled = true;
  new_playlist_btn.disabled = true;
}

function enableButtons()
{
  next_btn.disabled = false;
  prev_btn.disabled = false;
  add_btn.disabled = false;
  //remove_btn.disabled = false;
  seek_slider.disabled = false;
  volume_slider.disabled = false;

  playlist_text.disabled = false;
  new_playlist_btn.disabled = false;
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

async function removeTrack(event)
{
  disableButtons();
  console.log("target: " + event.target.getAttribute('data-url'));
  console.log("index: " + track_index)
  let target = event.target.getAttribute('data-url');

  filePaths.splice(target, 1);
  files.splice(target, 1);
  track_list.splice(target, 1);
  storage.splice(target, 1);

  if (track_list.length == 0) {
    resetPlayer();
    //location.reload();
  } else {
    if (target == track_index) {
      console.log("INDEX: " + track_index);
      console.log("LISTLENGth: " + track_list.length);
      track_index = (track_index == track_list.length) ? 0 : track_index;
      loadTrack(track_index);
    } else if (target < track_index) {
      track_index -= 1;
    }

    now_playing.textContent = (track_index + 1) + "/" + track_list.length;
    updateState();
    updateDisplayList();

    if (isPlaying) {
      playTrack();
    }
  }
  enableButtons();
}

function loadTrack(track_index) {
    clearInterval(updateTimer);

    resetValues();
   
    if (url) URL.revokeObjectURL(url);
    
    url = URL.createObjectURL(storage[track_index]);
    curr_track.src = url;
    curr_track.load();
   
    track_art.style.backgroundImage = track_list[track_index].image;
    track_name.textContent = track_list[track_index].name;
    track_artist.textContent = track_list[track_index].artist;
    now_playing.textContent = (track_index + 1) + "/" + track_list.length;
   
    updateTimer = setInterval(seekUpdate, 1000);

    curr_track.addEventListener("ended", nextTrack);
   
    random_bg_color();
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
    //document.querySelector('#remove-track-button').style.setProperty('--cover-color', bgColor);
    document.querySelector('#open-file-button').style.setProperty('--cover-color', bgColor);
}

function darkmodeToggle()
{
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

function lightMode()
{
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

function darkMode()
{
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

function resetPlayer() 
{
  pauseTrack();
  curr_track.src = "";
  now_playing.textContent = "0/0";
  track_art.style.backgroundImage = "url('./cat.gif')";
  track_name.textContent = "Zeneszám címe";
  track_artist.textContent = "Előadó neve";
  curr_time.textContent = "00:00";
  total_duration.textContent = "00:00";
  seek_slider.value = 0;
  storage = [];
  track_list = [];
  track_index = 0;
  shuffled = false;
  block = false;
  music_list.style.display = "none";
  music_list.innerHTML = "";
  document.body.style.background = 'lightgreen';
  document.querySelector('.darkmode_icon').style.setProperty('--cover-color', 'lightgreen');
  //document.querySelector('#remove-track-button').style.setProperty('--cover-color', 'lightgreen');
  document.querySelector('#open-file-button').style.setProperty('--cover-color', 'lightgreen');
}

function playpauseTrack() {
    if (!isPlaying) playTrack();
    else pauseTrack();
}
    
function playTrack() {
  console.log("TRACK_INDEX: ", track_index);

  if(document.getElementById("selected") != null) {
    document.getElementById("selected").removeAttribute("id");
  }
  music_list.children[track_index].setAttribute("id", "selected");

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

function nextTrack() 
{
  if (!isRepeating) 
  {
    if (shuffled)
    {
      let allShuffled=0;
      do
      {
        let i = Math.floor(Math.random() * files.length);
        track_index = i;
      }
      while (shuffleWeight[track_index] == true && allShuffled < files.length);
      shuffleWeight[track_index] = true;
      allShuffled += 1;

      if (allShuffled >= files.length)
      {
        shuffleWeight.forEach(element => {element=false;});
        allShuffled = 0;
      }
    }
    else
    {
      if (track_index < track_list.length - 1)
        track_index += 1;
      else track_index = 0;
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

function prevTrack() {
if (!isRepeating) {
  if (track_index > 0)
    track_index -= 1;
  else track_index = track_list.length - 1;

  loadTrack(track_index);
  playTrack();
} else {
  curr_track.currentTime = 0;
  playTrack();
}
}

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

function shuffleToggle() {
  if (!shuffled) {
    shuffled = true;
    shuffleIcon.innerHTML = '<img style="padding-top: 25px; padding-left: 15px; width: 32px; height: 32px;" src="./Shuffle.png" alt="Véletlen sorrend">'
    for(let i = 0; i < files.length; i++)
    {
      shuffleWeight[i] = false;
    }
    shuffleWeight[track_index] = true;
  } else {
    shuffled = false;
    shuffleIcon.innerHTML = '<img style="padding-top: 25px; padding-left: 15px; width: 32px; height: 32px;" src="./NoShuffle.png" alt="Véletlen sorrend">'
  }
  console.log("shuffled?: ", shuffled);
  //shuffleTracks();
}

async function shuffleTracks() //NOT IN USE! I just don't yet wanna remove it. It's cool...
{
  disableButtons();
  files = [];
  if (shuffled)
  {
    const tempFiles = [...nonShuffledFiles];
    console.log("length: ", tempFiles.length);
    while (tempFiles.length != 0)
    {
      let i = Math.floor(Math.random() * tempFiles.length);
      //console.log("i: ",i);
      files.push(tempFiles[i]);
      //console.log("tempFiles[i] before: ",tempFiles[i]);
      tempFiles.splice(i,1); 
      //console.log("tempFiles[i] after: ",tempFiles[i]);
      console.log("files.length: ", files.length);
    }
  }
  else
  {
    files = [...nonShuffledFiles];
  }
  await updateTrackList();
  updateDisplayList();
  loadTrack(track_index);
  pauseTrack();
  enableButtons();
}

function seekTo() 
{
    let seekto = curr_track.duration * (seek_slider.value / 100);
    curr_track.currentTime = seekto;
}
   
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