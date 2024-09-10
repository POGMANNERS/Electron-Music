const jsmediatags = window.jsmediatags;

let now_playing = document.querySelector(".now-playing");
let track_art = document.querySelector(".track-art");
let track_name = document.querySelector(".track-name");
let track_artist = document.querySelector(".track-artist");
 
let playpause_btn = document.querySelector(".playpause-track");
let next_btn = document.querySelector(".next-track");
let prev_btn = document.querySelector(".prev-track");
const add_btn = document.getElementById('open-file-button');
const remove_btn = document.getElementById('remove-track-button');

let seek_slider = document.querySelector(".seek_slider");
let seek;
let volume_slider = document.querySelector(".volume_slider");
let volume;
let curr_time = document.querySelector(".current-time");
let curr;
let total_duration = document.querySelector(".total-duration");
let total;

let files = [];
let filePaths = [];
let firstTime;

let storage = [];
let track_list = [];
let track_index = 0;
let isPlaying = false;
let updateTimer;
let url = "";
let music_list = document.querySelector("#songlist");
let isRepeating = false;
let block = false;
let repeatIcon = document.querySelector(".repeat-track");
 
let curr_track = document.createElement('audio');

document.addEventListener("DOMContentLoaded", async() => 
  {
    disableButtons();
    const loadState = await window.electronAPI.loadState();
    filePaths = loadState.filePaths || [];
    track_index = loadState.track_index || 0;
    isPlaying = loadState.isPlaying || false;
    isRepeating = loadState.isRepeating || false;
    volume = loadState.volume;

    console.log("TRACK_INDEX: ", track_index);

    if (filePaths.length!=0)
    {
      await loadUpFiles();
      await updateTrackList();
      updateDisplayList();
      loadTrack(track_index);
      pauseTrack();

      if (isRepeating)
      {
        isRepeating=false;
        repeatTrack();
      }

      volume_slider.value=volume;
      volume_slider.textContent=volume;
      setVolume();
    }
    enableButtons();
});

function updateState()
{
  const state = 
  {
    filePaths,
    track_index,
    isPlaying,
    isRepeating,
    volume,
  };
  window.electronAPI.backupState(state);
}

add_btn.addEventListener('click', async () => 
  {
    disableButtons();
    const tempfilePaths = await window.electronAPI.openFileDialog();
    for (temp of tempfilePaths)
    {
      filePaths.push(temp);
    }
    //console.log('File Paths: ',filePaths);
    
    await loadUpFiles();
    await updateTrackList();
    updateDisplayList();
    loadTrack(track_index);
    pauseTrack();
    updateState();

    enableButtons(); 
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
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
      const fileName = filePaths[i].split('\\').pop();
      const file = new File([blob], fileName, {type: 'audio/mpeg'});
      //console.log(file);
      files.push(file);
      i++;
      //console.log('LOAD UP COMPLETE!');
    }
  }
  catch (error) {console.error('Error with loadUpFiles: ', error);}
}

document.querySelector("#songlist").addEventListener("click", function(e) {
  track_index = parseInt(e.target.dataset.url);
  loadTrack(track_index);
  playTrack();
  updateState();
});

remove_btn.addEventListener('click', function() 
{
  removeTrack();
});

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

function disableButtons()
{
  next_btn.disabled = true;
  prev_btn.disabled = true;
  add_btn.disabled = true;
  remove_btn.disabled = true;
  seek_slider.disabled = true;
  volume_slider.disabled = true;
}
function enableButtons()
{
  next_btn.disabled = false;
  prev_btn.disabled = false;
  add_btn.disabled = false;
  remove_btn.disabled = false;
  seek_slider.disabled = false;
  volume_slider.disabled = false;
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

async function removeTrack()
{
  disableButtons();

  filePaths.splice(track_index, 1);
  files.splice(track_index, 1);
  track_list.splice(track_index, 1);
  storage.splice(track_index, 1);

  if(track_index == track_list.length)
    track_index = 0;

  updateState();
  if (track_list.length==0)
  {
    location.reload();
  }
  else
  {
    loadTrack(track_index);
    playTrack();
    updateDisplayList();
  
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
    now_playing.textContent =  (track_index + 1) + "/" + track_list.length;
   
    updateTimer = setInterval(seekUpdate, 1000);

    curr_track.addEventListener("ended", nextTrack);
   
    random_bg_color();
}
   
function random_bg_color() {
    let red = Math.floor(Math.random() * 256) + 64;
    let green = Math.floor(Math.random() * 256) + 64;
    let blue = Math.floor(Math.random() * 256) + 64;

    let bgColor;
    let darkmode = true;
    if (darkmode) {
      bgColor = "rgb(" + red/3 + ", " + green/3 + ", " + blue/3 + ")";
    } else {
      bgColor = "rgb(" + red + ", " + green + ", " + blue + ")";
    }

    document.body.style.background = bgColor;
}

function resetValues() {

    curr_time.textContent = "00:00";
    total_duration.textContent = "00:00";
    seek_slider.value = 0;

}

function playpauseTrack() {
    if (!isPlaying) playTrack();
    else pauseTrack();
}
    
function playTrack() 
{
  console.log("TRACK_INDEX: ", track_index);

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
    if (track_index < track_list.length - 1)
      track_index += 1;
    else track_index = 0;

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
    repeatIcon.innerHTML = '<img style="padding: 25px; width: 28px; height: 32px;" src="./Repeat.png" alt="Ismétlés">'
  } else {
    isRepeating = false;
    repeatIcon.innerHTML = '<img style="padding: 25px; width: 28px; height: 32px;" src="./NoRepeat.png" alt="Ismétlés">'
  }
  updateState();
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